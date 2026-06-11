import { Test, TestingModule } from "@nestjs/testing";
import { Sequelize } from "sequelize-typescript";
import { Player, RankingPoint } from "@badman/backend-database";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { PlayerLoaderService } from "../../loaders";
import { RankingPointResolver } from "./rankingPoint.resolver";

describe("RankingPointResolver — player ResolveField", () => {
  let resolver: RankingPointResolver;
  let playerLoaderService: { load: jest.Mock };
  let rankingSystemService: { getById: jest.Mock };

  beforeEach(async () => {
    playerLoaderService = { load: jest.fn() };
    rankingSystemService = { getById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingPointResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: PointsService,
          useValue: { createRankingPointforGame: jest.fn() },
        },
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
        {
          provide: PlayerLoaderService,
          useValue: playerLoaderService,
        },
      ],
    }).compile();

    resolver = module.get<RankingPointResolver>(RankingPointResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("player ResolveField", () => {
    it("delegates to playerLoader.load with the rankingPoint.playerId", async () => {
      const player = { id: "p1" } as unknown as Player;
      playerLoaderService.load.mockResolvedValue(player);
      const rankingPoint = { playerId: "p1" } as unknown as RankingPoint;

      const result = await resolver.player(rankingPoint);

      expect(playerLoaderService.load).toHaveBeenCalledWith("p1");
      expect(result).toBe(player);
    });

    it("returns null when playerId is null", async () => {
      playerLoaderService.load.mockResolvedValue(null);
      const rankingPoint = { playerId: null } as unknown as RankingPoint;

      const result = await resolver.player(rankingPoint);

      expect(result).toBeNull();
    });

    it("returns null when playerId is undefined", async () => {
      playerLoaderService.load.mockResolvedValue(null);
      const rankingPoint = { playerId: undefined } as unknown as RankingPoint;

      const result = await resolver.player(rankingPoint);

      expect(result).toBeNull();
    });

    it("batches N rows into a single Player.findAll call via the loader", async () => {
      const players = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }) as unknown as Player);
      const findAllSpy = jest.spyOn(Player, "findAll").mockResolvedValue(players as Player[]);

      const realLoader = new PlayerLoaderService();
      const rankingPoints = players.map((p) => ({ playerId: p.id }) as unknown as RankingPoint);

      const results = await Promise.all(rankingPoints.map((rp) => realLoader.load(rp.playerId)));

      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(10);
    });
  });
});
