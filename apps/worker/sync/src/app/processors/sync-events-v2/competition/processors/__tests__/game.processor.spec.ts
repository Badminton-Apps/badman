import {
  DrawCompetition,
  Game,
  GamePlayerMembership,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import { GameLinkType } from "@badman/utils";
import { XmlMatchTypeID, XmlScoreStatus } from "@badman/backend-visual";
import { GameCompetitionProcessor } from "../game.processor";

jest.mock("@badman/backend-database", () => {
  const GameMock = jest.fn().mockImplementation(() => ({
    id: undefined as string | undefined,
    linkId: undefined as string | undefined,
    linkType: undefined as string | undefined,
    visualCode: undefined as string | undefined,
    order: null as number | null,
    round: null as string | null,
    winner: null as number | null,
    gameType: undefined as string | undefined,
    status: undefined as string | undefined,
    playedAt: null as Date | null,
    set1Team1: null as number | null,
    set1Team2: null as number | null,
    set2Team1: null as number | null,
    set2Team2: null as number | null,
    set3Team1: null as number | null,
    set3Team2: null as number | null,
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    players: [],
  }));
  (GameMock as unknown as { findOne: jest.Mock }).findOne = jest.fn();

  return {
    DrawCompetition: { findByPk: jest.fn() },
    Game: GameMock,
    GamePlayerMembership: {
      destroy: jest.fn().mockResolvedValue(undefined),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    },
    Player: { findOne: jest.fn().mockResolvedValue(null) },
    RankingSystem: { findByPk: jest.fn(), findOne: jest.fn() },
    SubEventCompetition: { findByPk: jest.fn() },
  };
});

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      transactionId: "tx-1",
      eventCode: "EVENT-1",
      drawId: "draw-1",
      encounterId: "enc-1",
      encounterVisualCode: "ENC-VC-1",
      rankingSystemId: "rs-1",
      gameCode: 9001,
      options: {},
      ...overrides,
    },
  };
}

function makeXmlMatch(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    Code: 9001,
    MatchOrder: 3,
    MatchTypeID: XmlMatchTypeID.MS,
    ScoreStatus: XmlScoreStatus.Normal,
    Winner: 1,
    RoundName: null,
    MatchTime: null,
    Sets: { Set: [{ Team1: 21, Team2: 15 }] },
    Team1: { Player1: null, Player2: null },
    Team2: { Player1: null, Player2: null },
    ...overrides,
  };
}

describe("GameCompetitionProcessor", () => {
  let processor: GameCompetitionProcessor;
  let transactionManager: { getTransaction: jest.Mock };
  let visualService: { getGames: jest.Mock; getTeamMatch: jest.Mock };
  let pointService: { createRankingPointforGame: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionManager = { getTransaction: jest.fn().mockResolvedValue({}) };
    visualService = { getGames: jest.fn(), getTeamMatch: jest.fn() };
    pointService = { createRankingPointforGame: jest.fn().mockResolvedValue(undefined) };

    (DrawCompetition.findByPk as jest.Mock).mockResolvedValue({ id: "draw-1", subeventId: "sub-1" });
    (SubEventCompetition.findByPk as jest.Mock).mockResolvedValue({ id: "sub-1" });
    (RankingSystem.findByPk as jest.Mock).mockResolvedValue({ id: "rs-1" });
    (RankingSystem.findOne as jest.Mock).mockResolvedValue({ id: "rs-1" });

    processor = new GameCompetitionProcessor(
      transactionManager as never,
      visualService as never,
      pointService as never,
    );
  });

  it("throws when encounterId cannot be derived", async () => {
    (Game.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      processor.ProcessSyncCompetitionGame(
        makeJob({ encounterId: undefined, gameId: undefined }) as never,
      ),
    ).rejects.toThrow("encounterId is required");
  });

  it("throws when encounterVisualCode is missing", async () => {
    (Game.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      processor.ProcessSyncCompetitionGame(
        makeJob({ encounterVisualCode: undefined }) as never,
      ),
    ).rejects.toThrow("encounterVisualCode is required");
  });

  it("re-fetches games via getTeamMatch (not getGames at draw level)", async () => {
    const xmlMatch = makeXmlMatch({ Code: 9001 });
    (Game.findOne as jest.Mock).mockResolvedValue(null);
    visualService.getTeamMatch.mockResolvedValue([xmlMatch]);

    await processor.ProcessSyncCompetitionGame(makeJob() as never);

    // Must use getTeamMatch (hits /TeamMatch/{id}) — not getGames (/Draw/{id}/Match).
    expect(visualService.getTeamMatch).toHaveBeenCalledWith("EVENT-1", "ENC-VC-1");
    expect(visualService.getGames).not.toHaveBeenCalled();
  });

  it("stamps linkId=encounterId and linkType=COMPETITION when saving", async () => {
    const existingGame = {
      id: "game-existing",
      linkId: "enc-1",
      linkType: null as string | null,
      visualCode: null,
      order: 3,
      round: null,
      winner: null,
      playedAt: null,
      set1Team1: null,
      set1Team2: null,
      set2Team1: null,
      set2Team2: null,
      set3Team1: null,
      set3Team2: null,
      players: [],
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    (Game.findOne as jest.Mock).mockResolvedValue(existingGame);
    visualService.getTeamMatch.mockResolvedValue([makeXmlMatch()]);

    await processor.ProcessSyncCompetitionGame(
      makeJob({ gameId: "game-existing" }) as never,
    );

    expect(existingGame.linkId).toBe("enc-1");
    expect(existingGame.linkType).toBe(GameLinkType.COMPETITION);
    expect(existingGame.save).toHaveBeenCalled();
  });

  it("preserves existing local order when toernooi returns a different MatchOrder", async () => {
    const localGame = {
      id: "local",
      linkId: "enc-1",
      linkType: null as string | null,
      visualCode: null,
      order: 3, // local slot
      round: null,
      winner: null,
      playedAt: null,
      set1Team1: null,
      set1Team2: null,
      set2Team1: null,
      set2Team2: null,
      set3Team1: null,
      set3Team2: null,
      players: [],
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    (Game.findOne as jest.Mock).mockResolvedValue(localGame);
    visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ MatchOrder: 7 })]);

    await processor.ProcessSyncCompetitionGame(
      makeJob({ gameId: "local" }) as never,
    );

    expect(localGame.order).toBe(3); // unchanged, guard `if (game.order == null)`
  });

  it("preserves existing set scores when toernooi returns null for that set", async () => {
    const localGame = {
      id: "local",
      linkId: "enc-1",
      linkType: null as string | null,
      visualCode: null,
      order: 1,
      round: null,
      winner: null,
      playedAt: null,
      set1Team1: 21, // already has scores
      set1Team2: 19,
      set2Team1: null,
      set2Team2: null,
      set3Team1: null,
      set3Team2: null,
      players: [],
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    (Game.findOne as jest.Mock).mockResolvedValue(localGame);
    // Toernooi returns no sets
    visualService.getTeamMatch.mockResolvedValue([
      makeXmlMatch({ Sets: { Set: [{ Team1: null, Team2: null }] } }),
    ]);

    await processor.ProcessSyncCompetitionGame(
      makeJob({ gameId: "local" }) as never,
    );

    // Scores are preserved
    expect(localGame.set1Team1).toBe(21);
    expect(localGame.set1Team2).toBe(19);
  });

  it("throws 'game not found' when gameCode is not in the toernooi response", async () => {
    (Game.findOne as jest.Mock).mockResolvedValue(null);
    visualService.getTeamMatch.mockResolvedValue([makeXmlMatch({ Code: 8888 })]);

    await expect(
      processor.ProcessSyncCompetitionGame(makeJob({ gameCode: 9999 }) as never),
    ).rejects.toThrow("game not found");
  });

  it("does not update player memberships when game already had a winner", async () => {
    const existingGame = {
      id: "game-existing",
      linkId: "enc-1",
      linkType: null as string | null,
      visualCode: null,
      order: 3,
      round: null,
      winner: 1, // already decided
      playedAt: null,
      set1Team1: null,
      set1Team2: null,
      set2Team1: null,
      set2Team2: null,
      set3Team1: null,
      set3Team2: null,
      players: [],
      save: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    (Game.findOne as jest.Mock).mockResolvedValue(existingGame);
    visualService.getTeamMatch.mockResolvedValue([makeXmlMatch()]);

    await processor.ProcessSyncCompetitionGame(
      makeJob({ gameId: "game-existing" }) as never,
    );

    expect(GamePlayerMembership.destroy).not.toHaveBeenCalled();
    expect(GamePlayerMembership.bulkCreate).not.toHaveBeenCalled();
  });
});
