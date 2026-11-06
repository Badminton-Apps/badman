import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { RankingSystemService } from "@badman/backend-ranking";
import {
  EncounterCompetition,
  Game,
  GameNewInput,
  GameUpdateInput,
  Player,
  RankingSystem,
} from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { GraphQLError } from "graphql";
import { ErrorCode } from "../../utils/error-codes";
import { GamesResolver } from "./game.resolver";

describe("GamesResolver — players ResolveField (cache)", () => {
  let resolver: GamesResolver;
  let rankingSystemService: { getPrimary: jest.Mock };

  beforeEach(async () => {
    rankingSystemService = {
      getPrimary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesResolver,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
        {
          provide: getQueueToken(SyncQueue),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    resolver = module.get<GamesResolver>(GamesResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildGame = (
    memberships: Array<{ single: number | null; double: number | null; mix: number | null }>
  ) => {
    const gamePlayers = memberships.map((m, i) => {
      const gpm = {
        single: m.single,
        double: m.double,
        mix: m.mix,
        toJSON: () => ({ single: m.single, double: m.double, mix: m.mix }),
      };
      const player = {
        id: `player-${i}`,
        toJSON: () => ({ id: `player-${i}` }),
        GamePlayerMembership: gpm,
      };
      return player;
    });

    return {
      getPlayers: jest.fn().mockResolvedValue(gamePlayers),
    } as unknown as Game;
  };

  it("does NOT call rankingSystemService.getPrimary when all memberships have non-null rankings", async () => {
    const game = buildGame([
      { single: 5, double: 5, mix: 5 },
      { single: 3, double: 4, mix: 6 },
    ]);

    await resolver.players(game);

    expect(rankingSystemService.getPrimary).not.toHaveBeenCalled();
  });

  it("calls rankingSystemService.getPrimary exactly once when any membership has a null ranking", async () => {
    rankingSystemService.getPrimary.mockResolvedValue({
      id: "primary-id",
      amountOfLevels: 12,
      maxDiffLevels: 4,
    } as unknown as RankingSystem);

    const game = buildGame([
      { single: 5, double: null, mix: 5 },
      { single: 3, double: 4, mix: 6 },
    ]);

    await resolver.players(game);

    expect(rankingSystemService.getPrimary).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundException when getPrimary returns null and a fallback is needed", async () => {
    rankingSystemService.getPrimary.mockResolvedValue(null);

    const game = buildGame([{ single: null, double: null, mix: null }]);

    await expect(resolver.players(game)).rejects.toThrow(NotFoundException);
    await expect(resolver.players(game)).rejects.toThrow("No primary ranking system found");
  });
});

describe("GamesResolver — result rights", () => {
  const HOUR = 60 * 60 * 1000;
  let resolver: GamesResolver;
  let tx: { commit: jest.Mock; rollback: jest.Mock };

  const userWith = (id: string, claims: string[] = []) =>
    ({
      id,
      hasAnyPermission: jest.fn(async (permissions: string[]) =>
        permissions.some((permission) => claims.includes(permission))
      ),
    }) as unknown as Player;

  const gameLeader = userWith("leader-uuid");
  const encounterAdmin = userWith("admin-uuid", ["change-any:encounter"]);
  const homeClubAdmin = userWith("home-admin-uuid", ["home-club_enter:results"]);

  const encounterStartedAgo = (hours: number) =>
    ({
      id: "enc-uuid",
      gameLeaderId: "leader-uuid",
      date: new Date(Date.now() - hours * HOUR),
    }) as unknown as EncounterCompetition;

  const newGame = { linkId: "enc-uuid", linkType: "competition", order: 1 } as GameNewInput;
  const gameUpdate = { linkId: "enc-uuid", gameId: "game-uuid", set1Team1: 21 } as GameUpdateInput;

  async function expectWindowClosed(promise: Promise<unknown>) {
    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(GraphQLError);
    expect((error as GraphQLError).extensions["code"]).toBe(ErrorCode.RESULT_EDIT_WINDOW_CLOSED);
  }

  beforeEach(async () => {
    tx = { commit: jest.fn(), rollback: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesResolver,
        { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(tx) } },
        { provide: RankingSystemService, useValue: { getPrimary: jest.fn() } },
        { provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } },
      ],
    }).compile();

    resolver = module.get<GamesResolver>(GamesResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createGame", () => {
    let createSpy: jest.SpyInstance;

    beforeEach(() => {
      createSpy = jest.spyOn(Game, "create").mockResolvedValue({ id: "game-uuid" } as Game);
    });

    it("lets the game leader add a game within 36 hours", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(2));

      await expect(resolver.createGame(newGame, gameLeader)).resolves.toEqual({ id: "game-uuid" });
      expect(tx.commit).toHaveBeenCalled();
    });

    it("stops the game leader once 36 hours have passed", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(37));

      await expectWindowClosed(resolver.createGame(newGame, gameLeader));
      expect(createSpy).not.toHaveBeenCalled();
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("lets an encounter admin add a game after 36 hours", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(37));

      await expect(resolver.createGame(newGame, encounterAdmin)).resolves.toEqual({
        id: "game-uuid",
      });
    });

    it("keeps rejecting anyone else, including the home club admin", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(2));

      await expect(resolver.createGame(newGame, homeClubAdmin)).rejects.toThrow(
        "You are not the game leader"
      );
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("updateGame", () => {
    let game: Game;
    let findGameSpy: jest.SpyInstance;

    beforeEach(() => {
      game = { id: "game-uuid", playedAt: null, winner: 0 } as unknown as Game;
      game.update = jest.fn().mockResolvedValue(game);
      findGameSpy = jest.spyOn(Game, "findByPk").mockResolvedValue(game);
    });

    it("lets the game leader correct a game within 36 hours", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(2));

      await expect(resolver.updateGame(gameUpdate, gameLeader)).resolves.toBe(game);
      expect(game.update).toHaveBeenCalled();
    });

    it("stops the game leader once 36 hours have passed", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(37));

      await expectWindowClosed(resolver.updateGame(gameUpdate, gameLeader));
      expect(findGameSpy).not.toHaveBeenCalled();
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("lets an encounter admin correct a game after 36 hours", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(37));

      await expect(resolver.updateGame(gameUpdate, encounterAdmin)).resolves.toBe(game);
      expect(game.update).toHaveBeenCalled();
    });

    it("keeps rejecting anyone else, including the home club admin", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounterStartedAgo(2));

      await expect(resolver.updateGame(gameUpdate, homeClubAdmin)).rejects.toThrow(
        "You are not the game leader"
      );
      expect(findGameSpy).not.toHaveBeenCalled();
    });
  });
});
