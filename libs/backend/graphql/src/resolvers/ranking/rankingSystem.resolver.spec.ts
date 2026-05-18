import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Player, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { RankingSystemResolver } from "./rankingSystem.resolver";

describe("RankingSystemResolver — invalidation hook", () => {
  let resolver: RankingSystemResolver;
  let rankingSystemService: { invalidate: jest.Mock };
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({ hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    rankingSystemService = { invalidate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingSystemResolver,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue(mockTransaction),
          },
        },
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
      ],
    }).compile();

    resolver = module.get<RankingSystemResolver>(RankingSystemResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("updateRankingSystem", () => {
    it("calls invalidate() after a successful commit", async () => {
      const dbSystem = {
        primary: false,
        update: jest.fn().mockResolvedValue({ id: "s1" }),
      } as unknown as RankingSystem;
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(dbSystem);

      await resolver.updateRankingSystem(buildUser(true), { id: "s1" } as any);

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(rankingSystemService.invalidate).toHaveBeenCalledTimes(1);
    });

    it("does NOT call invalidate() when the transaction rolls back", async () => {
      const dbSystem = {
        primary: false,
        update: jest.fn().mockRejectedValue(new Error("db boom")),
      } as unknown as RankingSystem;
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(dbSystem);

      await expect(
        resolver.updateRankingSystem(buildUser(true), { id: "s1" } as any)
      ).rejects.toThrow("db boom");

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(rankingSystemService.invalidate).not.toHaveBeenCalled();
    });

    it("does NOT call invalidate() when the caller is unauthorized", async () => {
      await expect(
        resolver.updateRankingSystem(buildUser(false), { id: "s1" } as any)
      ).rejects.toThrow(UnauthorizedException);

      expect(rankingSystemService.invalidate).not.toHaveBeenCalled();
    });
  });

  describe("removeRankingSystem", () => {
    it("calls invalidate() after a successful commit", async () => {
      const dbSystem = {
        destroy: jest.fn().mockResolvedValue(undefined),
      } as unknown as RankingSystem;
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(dbSystem);

      const result = await resolver.removeRankingSystem(buildUser(true), "s1");

      expect(result).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(rankingSystemService.invalidate).toHaveBeenCalledTimes(1);
    });

    it("does NOT call invalidate() when destroy throws (rollback path)", async () => {
      const dbSystem = {
        destroy: jest.fn().mockRejectedValue(new Error("fk violation")),
      } as unknown as RankingSystem;
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(dbSystem);

      await expect(resolver.removeRankingSystem(buildUser(true), "s1")).rejects.toThrow(
        "fk violation"
      );

      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(rankingSystemService.invalidate).not.toHaveBeenCalled();
    });
  });
});
