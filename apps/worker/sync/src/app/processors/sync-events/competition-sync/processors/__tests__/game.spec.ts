import {
  Game,
  GamePlayerMembership,
  Player,
  RankingSystem,
} from "@badman/backend-database";
import { EncounterGamesGenerationService } from "@badman/backend-encounter-games";
import { VisualService, XmlMatchTypeID, XmlScoreStatus } from "@badman/backend-visual";
import { GameLinkType, GameStatus } from "@badman/utils";
import { CompetitionSyncGameProcessor } from "../game";

jest.mock("@badman/backend-database", () => ({
  EncounterCompetition: jest.fn(),
  Game: {
    findAll: jest.fn(),
  },
  GamePlayerMembership: {
    destroy: jest.fn().mockResolvedValue(undefined),
    bulkCreate: jest.fn().mockResolvedValue(undefined),
  },
  Player: {
    findOne: jest.fn().mockResolvedValue(null),
  },
  RankingSystem: {
    findOne: jest.fn(),
  },
}));

interface FakeGame {
  id: string;
  linkId: string;
  linkType: string;
  order: number | null;
  visualCode: string | null;
  winner: number | null;
  set1Team1: number | null;
  set1Team2: number | null;
  set2Team1: number | null;
  set2Team2: number | null;
  set3Team1: number | null;
  set3Team2: number | null;
  status: GameStatus | null;
  round: string | null;
  playedAt: Date | null;
  changed: jest.Mock;
  save: jest.Mock;
  players?: unknown[];
}

function makeFakeGame(overrides: Partial<FakeGame> = {}): FakeGame {
  return {
    id: "g1",
    linkId: "enc-1",
    linkType: GameLinkType.COMPETITION,
    order: 1,
    visualCode: "500",
    winner: null,
    set1Team1: null,
    set1Team2: null,
    set2Team1: null,
    set2Team2: null,
    set3Team1: null,
    set3Team2: null,
    status: GameStatus.NORMAL,
    round: null,
    playedAt: new Date("2025-01-01"),
    changed: jest.fn().mockReturnValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeXmlMatch(overrides: Record<string, unknown> = {}) {
  return {
    Code: "500",
    MatchOrder: 1,
    MatchTypeID: XmlMatchTypeID.MS,
    Winner: 0,
    ScoreStatus: XmlScoreStatus.Normal,
    RoundName: null,
    MatchTime: null,
    Sets: { Set: [] },
    Team1: { Player1: null, Player2: null },
    Team2: { Player1: null, Player2: null },
    ...overrides,
  };
}

function makeEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-1",
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    date: new Date("2025-01-01"),
    finished: false,
    ...overrides,
  };
}

describe("CompetitionSyncGameProcessor — per-field merge policy", () => {
  let processor: CompetitionSyncGameProcessor;
  let visualService: { getTeamMatch: jest.Mock };
  let gamesService: { generateGames: jest.Mock };
  let fakeGame: FakeGame;

  beforeEach(() => {
    jest.clearAllMocks();

    visualService = { getTeamMatch: jest.fn() };
    gamesService = { generateGames: jest.fn().mockResolvedValue(undefined) };

    fakeGame = makeFakeGame();

    (RankingSystem.findOne as jest.Mock).mockResolvedValue({ id: "rs-1" });
    (Game.findAll as jest.Mock).mockResolvedValue([fakeGame]);
    (Player.findOne as jest.Mock).mockResolvedValue(null);
    (GamePlayerMembership.destroy as jest.Mock).mockResolvedValue(undefined);
    (GamePlayerMembership.bulkCreate as jest.Mock).mockResolvedValue(undefined);

    processor = new CompetitionSyncGameProcessor(
      { Code: "TOURN-1" } as never,
      visualService as unknown as VisualService,
      gamesService as unknown as EncounterGamesGenerationService,
      { transaction: {} as never },
    );

    processor.encounters = [
      { encounter: makeEncounter() as never, internalId: 100 },
    ];
  });

  describe("local filled, toernooi empty", () => {
    it("preserves local winner when toernooi sends Winner=0 (NOT_YET_PLAYED)", async () => {
      fakeGame.winner = 1;
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Winner: 0 })]);

      await processor.process();

      expect(fakeGame.winner).toBe(1);
    });

    it("preserves local status WALKOVER when toernooi sends default ScoreStatus=Normal", async () => {
      fakeGame.status = GameStatus.WALKOVER;
      fakeGame.winner = 1;
      visualService.getTeamMatch.mockResolvedValue([
        makeXmlMatch({ Winner: 0, ScoreStatus: XmlScoreStatus.Normal }),
      ]);

      await processor.process();

      expect(fakeGame.status).toBe(GameStatus.WALKOVER);
    });

    it("preserves local set scores when toernooi has no sets", async () => {
      fakeGame.set1Team1 = 21;
      fakeGame.set1Team2 = 19;
      fakeGame.set2Team1 = 18;
      fakeGame.set2Team2 = 21;
      fakeGame.set3Team1 = 21;
      fakeGame.set3Team2 = 15;
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Sets: { Set: [] } })]);

      await processor.process();

      expect(fakeGame.set1Team1).toBe(21);
      expect(fakeGame.set1Team2).toBe(19);
      expect(fakeGame.set2Team1).toBe(18);
      expect(fakeGame.set2Team2).toBe(21);
      expect(fakeGame.set3Team1).toBe(21);
      expect(fakeGame.set3Team2).toBe(15);
    });

    it("preserves all local fields together (full scored game, toernooi empty slot)", async () => {
      fakeGame.winner = 1;
      fakeGame.set1Team1 = 21;
      fakeGame.set1Team2 = 19;
      fakeGame.status = GameStatus.NORMAL;
      visualService.getTeamMatch.mockResolvedValue([
        makeXmlMatch({
          Winner: 0,
          ScoreStatus: XmlScoreStatus.Normal,
          Sets: { Set: [] },
        }),
      ]);

      await processor.process();

      expect(fakeGame.winner).toBe(1);
      expect(fakeGame.set1Team1).toBe(21);
      expect(fakeGame.set1Team2).toBe(19);
      expect(fakeGame.status).toBe(GameStatus.NORMAL);
    });
  });

  describe("toernooi wins when it has real data", () => {
    it("overwrites local winner with toernooi Winner > 0", async () => {
      fakeGame.winner = 1;
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Winner: 2 })]);

      await processor.process();

      expect(fakeGame.winner).toBe(2);
    });

    it("overwrites local status when toernooi sends non-Normal ScoreStatus", async () => {
      fakeGame.status = GameStatus.NORMAL;
      visualService.getTeamMatch.mockResolvedValue([
        makeXmlMatch({ Winner: 0, ScoreStatus: XmlScoreStatus.Walkover }),
      ]);

      await processor.process();

      expect(fakeGame.status).toBe(GameStatus.WALKOVER);
    });

    it("overwrites local set scores when toernooi has sets", async () => {
      fakeGame.set1Team1 = null;
      fakeGame.set1Team2 = null;
      visualService.getTeamMatch.mockResolvedValue([
        makeXmlMatch({ Sets: { Set: [{ Team1: 21, Team2: 15 }] } }),
      ]);

      await processor.process();

      expect(fakeGame.set1Team1).toBe(21);
      expect(fakeGame.set1Team2).toBe(15);
    });
  });

  describe("membership protection", () => {
    it("does not rewrite player memberships when the game already had a winner", async () => {
      fakeGame.winner = 1;
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Winner: 2 })]);

      await processor.process();

      expect(GamePlayerMembership.destroy).not.toHaveBeenCalled();
      expect(GamePlayerMembership.bulkCreate).not.toHaveBeenCalled();
    });

    it("rewrites memberships when the local game had no winner yet", async () => {
      fakeGame.winner = null;
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Winner: 2 })]);

      await processor.process();

      expect(GamePlayerMembership.destroy).toHaveBeenCalled();
      expect(GamePlayerMembership.bulkCreate).toHaveBeenCalled();
    });
  });

  describe("8-slot invariant", () => {
    it("calls generateGames when encounter has homeTeamId", async () => {
      visualService.getTeamMatch.mockResolvedValue([]);

      await processor.process();

      expect(gamesService.generateGames).toHaveBeenCalledWith("enc-1", expect.anything());
    });

    it("skips generateGames when encounter has no homeTeamId", async () => {
      processor.encounters = [
        { encounter: makeEncounter({ homeTeamId: null }) as never, internalId: 100 },
      ];
      visualService.getTeamMatch.mockResolvedValue([]);

      await processor.process();

      expect(gamesService.generateGames).not.toHaveBeenCalled();
    });

    it("continues sync gracefully when generateGames throws", async () => {
      gamesService.generateGames.mockRejectedValue(new Error("home not found"));
      visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Winner: 2 })]);

      await expect(processor.process()).resolves.toBeDefined();
      // Merge still ran — winner got updated
      expect(fakeGame.winner).toBe(2);
    });
  });
});
