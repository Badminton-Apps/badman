import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RankingLastPlace, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { LastRankingPlaceResolver } from "./lastRankingPlace.resolver";

describe("LastRankingPlaceResolver — rankingSystem ResolveField", () => {
  let resolver: LastRankingPlaceResolver;
  let rankingSystemService: { getById: jest.Mock };

  beforeEach(async () => {
    rankingSystemService = { getById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LastRankingPlaceResolver,
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
      ],
    }).compile();

    resolver = module.get<LastRankingPlaceResolver>(LastRankingPlaceResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls getById with rankingPlace.systemId", async () => {
    const place = { systemId: "s1" } as unknown as RankingLastPlace;
    rankingSystemService.getById.mockResolvedValue({ id: "s1" });

    await resolver.rankingSystem(place);

    expect(rankingSystemService.getById).toHaveBeenCalledWith("s1");
  });

  it("returns the resolved system on success", async () => {
    const place = { systemId: "s1" } as unknown as RankingLastPlace;
    const system = { id: "s1" } as unknown as RankingSystem;
    rankingSystemService.getById.mockResolvedValue(system);

    const result = await resolver.rankingSystem(place);

    expect(result).toBe(system);
  });

  it("throws NotFoundException when getById returns null", async () => {
    const place = { systemId: "missing" } as unknown as RankingLastPlace;
    rankingSystemService.getById.mockResolvedValue(null);

    await expect(resolver.rankingSystem(place)).rejects.toThrow(NotFoundException);
  });
});
