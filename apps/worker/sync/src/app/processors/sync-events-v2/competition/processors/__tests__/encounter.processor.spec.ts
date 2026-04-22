import { DrawCompetition, EncounterCompetition, RankingSystem } from "@badman/backend-database";
import { Sync } from "@badman/backend-queue";
import { GameLinkType } from "@badman/utils";
import { EncounterCompetitionProcessor } from "../encounter.processor";

jest.mock("@badman/backend-database", () => {
  const EncounterCompetitionMock = jest.fn().mockImplementation(() => ({
    id: undefined as string | undefined,
    visualCode: undefined as string | undefined,
    drawId: undefined as string | undefined,
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getGames: jest.fn().mockResolvedValue([]),
  }));
  (EncounterCompetitionMock as unknown as { findOne: jest.Mock }).findOne = jest.fn();
  return {
    DrawCompetition: { findByPk: jest.fn() },
    EncounterCompetition: EncounterCompetitionMock,
    RankingSystem: { findOne: jest.fn() },
  };
});

type MockGame = {
  id: string;
  visualCode?: string | null;
  order?: number;
  set1Team1?: number | null;
  set1Team2?: number | null;
  destroy: jest.Mock;
};

function makeGame(overrides: Partial<MockGame> = {}): MockGame {
  return {
    id: `game-${Math.random().toString(36).slice(2, 8)}`,
    visualCode: null,
    order: 1,
    set1Team1: null,
    set1Team2: null,
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      transactionId: "tx-1",
      eventCode: "EVENT-1",
      drawId: "draw-1",
      rankingSystemId: "rs-1",
      encounterId: "enc-1",
      encounterCode: 1001,
      options: { updateMatches: true },
      games: [],
      ...overrides,
    },
  };
}

describe("EncounterCompetitionProcessor", () => {
  let processor: EncounterCompetitionProcessor;
  let transactionManager: { getTransaction: jest.Mock; addJob: jest.Mock };
  let visualService: { getGames: jest.Mock; getTeamMatch: jest.Mock };
  let generationService: { generateGames: jest.Mock };
  let syncQueue: { add: jest.Mock };
  let encounter: {
    id: string;
    visualCode: string;
    drawId: string;
    getGames: jest.Mock;
    save: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionManager = {
      getTransaction: jest.fn().mockResolvedValue({}),
      addJob: jest.fn().mockResolvedValue(undefined),
    };
    visualService = { getGames: jest.fn(), getTeamMatch: jest.fn() };
    generationService = { generateGames: jest.fn().mockResolvedValue([]) };
    syncQueue = {
      add: jest.fn().mockImplementation((name: string) =>
        Promise.resolve({ id: `job-${name}` }),
      ),
    };

    encounter = {
      id: "enc-1",
      visualCode: "ENC-VC-1",
      drawId: "draw-1",
      getGames: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    (EncounterCompetition.findOne as jest.Mock).mockResolvedValue(encounter);
    (DrawCompetition.findByPk as jest.Mock).mockResolvedValue({ id: "draw-1" });
    (RankingSystem.findOne as jest.Mock).mockResolvedValue({ id: "rs-1" });

    processor = new EncounterCompetitionProcessor(
      transactionManager as never,
      visualService as never,
      generationService as never,
      syncQueue as never,
    );
  });

  describe("ProcessSyncCompetitionEncounter", () => {
    it("calls generateGames after saving the encounter", async () => {
      visualService.getTeamMatch.mockResolvedValue([]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      expect(generationService.generateGames).toHaveBeenCalledWith(
        encounter.id,
        expect.anything(),
      );
      expect(generationService.generateGames).toHaveBeenCalledTimes(1);
      // Order matters: save then generateGames
      const saveOrder = encounter.save.mock.invocationCallOrder[0];
      const genOrder = generationService.generateGames.mock.invocationCallOrder[0];
      expect(saveOrder).toBeLessThan(genOrder);
    });

    it("fetches encounter games via getTeamMatch (not getGames)", async () => {
      visualService.getTeamMatch.mockResolvedValue([]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      expect(visualService.getTeamMatch).toHaveBeenCalledWith("EVENT-1", "ENC-VC-1");
      expect(visualService.getGames).not.toHaveBeenCalled();
    });
  });

  describe("reconciliation in processGames", () => {
    it("protects local slot with set scores — no game job queued for that match", async () => {
      const scoredLocal = makeGame({
        id: "local-scored",
        visualCode: null,
        order: 3,
        set1Team1: 21,
        set1Team2: 18,
      });
      encounter.getGames.mockResolvedValue([scoredLocal]);
      visualService.getTeamMatch.mockResolvedValue([
        { Code: "T-match-3", MatchOrder: 3 },
      ]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      expect(scoredLocal.destroy).not.toHaveBeenCalled();
      const gameJobCalls = syncQueue.add.mock.calls.filter(
        ([name]) => name === Sync.ProcessSyncCompetitionGame,
      );
      expect(gameJobCalls).toHaveLength(0);
    });

    it("merges toernooi into unscored local slot — queues game job with local gameId", async () => {
      const unscoredLocal = makeGame({
        id: "local-unscored",
        visualCode: null,
        order: 2,
        set1Team1: null,
        set1Team2: null,
      });
      encounter.getGames.mockResolvedValue([unscoredLocal]);
      visualService.getTeamMatch.mockResolvedValue([
        { Code: "T-match-2", MatchOrder: 2 },
      ]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      expect(unscoredLocal.destroy).not.toHaveBeenCalled();

      const gameJobCalls = syncQueue.add.mock.calls.filter(
        ([name]) => name === Sync.ProcessSyncCompetitionGame,
      );
      expect(gameJobCalls).toHaveLength(1);
      expect(gameJobCalls[0][1]).toMatchObject({
        encounterId: encounter.id,
        encounterVisualCode: encounter.visualCode,
        gameCode: "T-match-2",
        gameId: "local-unscored",
      });
    });

    it("destroys synced game whose visualCode no longer appears upstream", async () => {
      const staleSynced = makeGame({
        id: "synced-stale",
        visualCode: "T-old-9",
        order: 4,
      });
      encounter.getGames.mockResolvedValue([staleSynced]);
      visualService.getTeamMatch.mockResolvedValue([
        { Code: "T-match-4", MatchOrder: 4 },
      ]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      expect(staleSynced.destroy).toHaveBeenCalledTimes(1);
    });

    it("passes encounterVisualCode on every queued game job", async () => {
      encounter.getGames.mockResolvedValue([]);
      visualService.getTeamMatch.mockResolvedValue([
        { Code: "T1", MatchOrder: 1 },
        { Code: "T2", MatchOrder: 2 },
      ]);

      await processor.ProcessSyncCompetitionEncounter(makeJob() as never);

      const gameJobCalls = syncQueue.add.mock.calls.filter(
        ([name]) => name === Sync.ProcessSyncCompetitionGame,
      );
      expect(gameJobCalls).toHaveLength(2);
      for (const [, payload] of gameJobCalls) {
        expect(payload).toMatchObject({
          encounterVisualCode: "ENC-VC-1",
          encounterId: "enc-1",
          drawId: "draw-1",
        });
      }
    });
  });

  describe("deleteEncounter path", () => {
    it("preserves games that have set scores", async () => {
      const scored = makeGame({ id: "scored", set1Team1: 21 });
      const unscored = makeGame({ id: "unscored" });
      encounter.getGames.mockResolvedValue([scored, unscored]);
      visualService.getTeamMatch.mockResolvedValue([]);

      await processor.ProcessSyncCompetitionEncounter(
        makeJob({ options: { deleteEncounter: true } }) as never,
      );

      expect(scored.destroy).not.toHaveBeenCalled();
      expect(unscored.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
