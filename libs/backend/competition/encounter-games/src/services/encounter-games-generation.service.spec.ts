import { EncounterCompetition, Game, GamePlayerMembership, RankingSystem } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { EncounterGamesGenerationService } from "./encounter-games-generation.service";

// Simple unit tests using jest mocks — no real DB required
jest.mock("@badman/backend-database", () => ({
  EncounterCompetition: { findByPk: jest.fn() },
  Game: { findAll: jest.fn(), create: jest.fn() },
  GamePlayerMembership: { create: jest.fn() },
  RankingLastPlace: { findOne: jest.fn() },
  RankingSystem: { findOne: jest.fn() },
  Team: {},
}));

describe("EncounterGamesGenerationService", () => {
  let service: EncounterGamesGenerationService;

  beforeEach(() => {
    service = new EncounterGamesGenerationService();
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateGames", () => {
    const encounterId = "encounter-uuid";
    const homeTeamId = "home-team-uuid";
    const awayTeamId = "away-team-uuid";

    const mockEncounter = {
      home: { type: SubEventTypeEnum.M },
      homeTeamId,
      awayTeamId,
      getAssemblies: jest.fn().mockResolvedValue([
        {
          teamId: homeTeamId,
          assembly: {
            double1: ["p1", "p2"],
            double2: ["p3", "p4"],
            double3: ["p5", "p6"],
            double4: ["p7", "p8"],
            single1: "p9",
            single2: "p10",
            single3: "p11",
            single4: "p12",
          },
        },
        {
          teamId: awayTeamId,
          assembly: {
            double1: ["a1", "a2"],
            double2: ["a3", "a4"],
            double3: ["a5", "a6"],
            double4: ["a7", "a8"],
            single1: "a9",
            single2: "a10",
            single3: "a11",
            single4: "a12",
          },
        },
      ]),
    };

    it("should create 8 games for a men's encounter with no existing games", async () => {
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(mockEncounter);
      (Game.findAll as jest.Mock)
        .mockResolvedValueOnce([]) // existing games check
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ order: i + 1 }))); // final return
      (Game.create as jest.Mock).mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: `game-${data["order"]}`, ...data })
      );
      (GamePlayerMembership.create as jest.Mock).mockResolvedValue({});
      (RankingSystem.findOne as jest.Mock).mockResolvedValue({ id: "system-uuid" });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RankingLastPlace } = require("@badman/backend-database");
      (RankingLastPlace.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.generateGames(encounterId);

      expect(Game.create).toHaveBeenCalledTimes(8);
      expect(result).toHaveLength(8);

      // First slot should be double1 → gameType D
      expect(Game.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ order: 1, gameType: "D", linkType: "competition" }),
      );

      // 5th slot should be single1 → gameType S
      expect(Game.create).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({ order: 5, gameType: "S" }),
      );
    });

    it("should be idempotent: skip already-existing orders", async () => {
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(mockEncounter);
      // Orders 1-7 already exist
      (Game.findAll as jest.Mock)
        .mockResolvedValueOnce(
          Array.from({ length: 7 }, (_, i) => ({ order: i + 1 }))
        )
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ order: i + 1 })));
      (Game.create as jest.Mock).mockResolvedValue({ id: "game-8", order: 8 });
      (GamePlayerMembership.create as jest.Mock).mockResolvedValue({});
      (RankingSystem.findOne as jest.Mock).mockResolvedValue(null);

      await service.generateGames(encounterId);

      // Only slot 8 should be created
      expect(Game.create).toHaveBeenCalledTimes(1);
      expect(Game.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 8 }),
      );
    });

    it("should use MX game type for all MX team slots", async () => {
      const mxEncounter = {
        ...mockEncounter,
        home: { type: SubEventTypeEnum.MX },
        getAssemblies: jest.fn().mockResolvedValue([]),
      };
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(mxEncounter);
      (Game.findAll as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (Game.create as jest.Mock).mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: `game-${data["order"]}`, ...data })
      );
      (GamePlayerMembership.create as jest.Mock).mockResolvedValue({});
      (RankingSystem.findOne as jest.Mock).mockResolvedValue(null);

      await service.generateGames(encounterId);

      // All 8 games should have gameType MX
      for (let i = 1; i <= 8; i++) {
        expect(Game.create).toHaveBeenNthCalledWith(
          i,
          expect.objectContaining({ gameType: "MX" }),
        );
      }
    });

    it("should throw NotFoundException when encounter is not found", async () => {
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.generateGames(encounterId)).rejects.toThrow(
        "EncounterCompetition not found"
      );
    });
  });
});
