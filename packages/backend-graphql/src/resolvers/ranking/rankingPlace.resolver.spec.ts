import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { RankingPlace, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { RankingPlaceResolver } from "./rankingPlace.resolver";

describe("RankingPlaceResolver — cache integration", () => {
  let resolver: RankingPlaceResolver;
  let rankingSystemService: { getById: jest.Mock };

  beforeEach(async () => {
    rankingSystemService = { getById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingPlaceResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
      ],
    }).compile();

    resolver = module.get<RankingPlaceResolver>(RankingPlaceResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("rankingPlace(id) query", () => {
    it("does NOT call getById when single/double/mix are all set", async () => {
      const place = {
        id: "p1",
        systemId: "s1",
        single: 5,
        double: 5,
        mix: 5,
      } as unknown as RankingPlace;
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);

      const result = await resolver.rankingPlace("p1");

      expect(result).toBe(place);
      expect(rankingSystemService.getById).not.toHaveBeenCalled();
    });

    it("calls getById exactly once with the systemId when any level is null", async () => {
      const place = {
        id: "p1",
        systemId: "s1",
        single: null,
        double: 5,
        mix: 5,
      } as unknown as RankingPlace;
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      rankingSystemService.getById.mockResolvedValue({
        id: "s1",
        amountOfLevels: 12,
        maxDiffLevels: 4,
      });

      await resolver.rankingPlace("p1");

      expect(rankingSystemService.getById).toHaveBeenCalledTimes(1);
      expect(rankingSystemService.getById).toHaveBeenCalledWith("s1");
    });

    it("throws NotFoundException when getById returns null", async () => {
      const place = {
        id: "p1",
        systemId: "s1",
        single: null,
        double: 5,
        mix: 5,
      } as unknown as RankingPlace;
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      rankingSystemService.getById.mockResolvedValue(null);

      await expect(resolver.rankingPlace("p1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("rankingSystem ResolveField", () => {
    it("calls getById with the parent's systemId and returns its value", async () => {
      const place = { systemId: "s1" } as unknown as RankingPlace;
      const system = { id: "s1" } as unknown as RankingSystem;
      rankingSystemService.getById.mockResolvedValue(system);

      const result = await resolver.rankingSystem(place);

      expect(result).toBe(system);
      expect(rankingSystemService.getById).toHaveBeenCalledWith("s1");
    });

    it("returns null when the service returns null (preserved by contract)", async () => {
      const place = { systemId: "s1" } as unknown as RankingPlace;
      rankingSystemService.getById.mockResolvedValue(null);

      const result = await resolver.rankingSystem(place);

      expect(result).toBeNull();
    });
  });
});
