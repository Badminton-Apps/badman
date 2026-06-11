import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { RankingSystemService } from "@badman/backend-ranking";
import { Game, RankingSystem } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
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
