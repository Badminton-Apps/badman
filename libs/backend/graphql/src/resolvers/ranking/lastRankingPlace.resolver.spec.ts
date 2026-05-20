import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Player, RankingLastPlace, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { PlayerLoaderService } from "../../loaders";
import { LastRankingPlaceResolver } from "./lastRankingPlace.resolver";

describe("LastRankingPlaceResolver", () => {
  let resolver: LastRankingPlaceResolver;
  let rankingSystemService: { getById: jest.Mock };
  let playerLoader: { load: jest.Mock };

  beforeEach(async () => {
    rankingSystemService = { getById: jest.fn() };
    playerLoader = { load: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LastRankingPlaceResolver,
        {
          provide: RankingSystemService,
          useValue: rankingSystemService,
        },
        {
          provide: PlayerLoaderService,
          useValue: playerLoader,
        },
      ],
    }).compile();

    resolver = module.get<LastRankingPlaceResolver>(LastRankingPlaceResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── rankingSystem ResolveField ────────────────────────────────────────────

  describe("rankingSystem", () => {
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

  // ── player ResolveField ───────────────────────────────────────────────────

  describe("player", () => {
    it("calls playerLoader.load with rankingPlace.playerId", async () => {
      const place = { playerId: "p1" } as unknown as RankingLastPlace;
      const player = { id: "p1" } as unknown as Player;
      playerLoader.load.mockResolvedValue(player);

      const result = await resolver.player(place);

      expect(playerLoader.load).toHaveBeenCalledWith("p1");
      expect(result).toBe(player);
    });

    it("returns null when playerId is null", async () => {
      const place = { playerId: null } as unknown as RankingLastPlace;
      playerLoader.load.mockResolvedValue(null);

      const result = await resolver.player(place);

      expect(playerLoader.load).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });

    it("returns null when playerId is undefined", async () => {
      const place = { playerId: undefined } as unknown as RankingLastPlace;
      playerLoader.load.mockResolvedValue(null);

      const result = await resolver.player(place);

      expect(playerLoader.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("batches N rows via a single playerLoader (DataLoader contract)", async () => {
      // Simulate 10 ranking places — all resolved via a single batch call
      const places = Array.from({ length: 10 }, (_, i) => ({
        playerId: `p${i}`,
      })) as unknown as RankingLastPlace[];

      const players = places.map((p) => ({ id: p.playerId }) as unknown as Player);

      // The loader.load spy must return the matching player for each call
      playerLoader.load.mockImplementation((id: string) =>
        Promise.resolve(players.find((pl) => pl.id === id) ?? null)
      );

      // Spy on Player.findAll to confirm it is NOT called by the resolver itself
      const findAllSpy = jest.spyOn(Player, "findAll").mockResolvedValue([]);

      const results = await Promise.all(places.map((place) => resolver.player(place)));

      // Each place resolved to its player
      expect(results).toHaveLength(10);
      results.forEach((r, i) => expect(r?.id).toBe(`p${i}`));

      // The resolver MUST delegate to the loader — not call Player.findAll directly
      expect(findAllSpy).not.toHaveBeenCalled();

      // The loader was called once per place (batching is internal to DataLoader)
      expect(playerLoader.load).toHaveBeenCalledTimes(10);
    });
  });
});
