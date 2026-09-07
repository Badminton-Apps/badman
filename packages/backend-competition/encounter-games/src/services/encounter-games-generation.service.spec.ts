import {
  EncounterCompetition,
  Game,
  GamePlayerMembership,
  RankingSystem,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { Sequelize } from "sequelize-typescript";
import { EncounterGamesGenerationService } from "./encounter-games-generation.service";

// Simple unit tests using jest mocks — no real DB required
jest.mock("@badman/backend-database", () => ({
  EncounterCompetition: { findByPk: jest.fn() },
  Game: { findAll: jest.fn(), create: jest.fn() },
  GamePlayerMembership: { create: jest.fn(), destroy: jest.fn() },
  RankingLastPlace: { findOne: jest.fn() },
  RankingSystem: { findOne: jest.fn() },
  Team: {},
}));

describe("EncounterGamesGenerationService", () => {
  let service: EncounterGamesGenerationService;

  beforeEach(() => {
    const mockSequelize = {
      transaction: jest.fn((cb?: (t: unknown) => Promise<unknown>) =>
        typeof cb === "function" ? cb({}) : Promise.resolve({})
      ),
    } as unknown as Sequelize;
    service = new EncounterGamesGenerationService(mockSequelize);
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

      const { RankingLastPlace } = require("@badman/backend-database");
      (RankingLastPlace.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.generateGames(encounterId);

      expect(Game.create).toHaveBeenCalledTimes(8);
      expect(result).toHaveLength(8);

      // First slot should be double1 → gameType D
      expect(Game.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ order: 1, gameType: "D", linkType: "competition" }),
        expect.objectContaining({ transaction: expect.anything() })
      );

      // 5th slot should be single1 → gameType S
      expect(Game.create).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({ order: 5, gameType: "S" }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });

    it("should be idempotent: skip already-existing orders", async () => {
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(mockEncounter);
      // Orders 1-7 already exist (with update mock for gameType correction)
      const existingGames = Array.from({ length: 7 }, (_, i) => ({
        order: i + 1,
        gameType: "D",
        winner: null,
        update: jest.fn().mockResolvedValue(undefined),
      }));
      (Game.findAll as jest.Mock)
        .mockResolvedValueOnce(existingGames)
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ order: i + 1 })));
      (Game.create as jest.Mock).mockResolvedValue({ id: "game-8", order: 8 });
      (GamePlayerMembership.create as jest.Mock).mockResolvedValue({});
      (GamePlayerMembership.destroy as jest.Mock).mockResolvedValue(0);
      (RankingSystem.findOne as jest.Mock).mockResolvedValue(null);

      await service.generateGames(encounterId);

      // Only slot 8 should be created
      expect(Game.create).toHaveBeenCalledTimes(1);
      expect(Game.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 8 }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });

    it("should use correct game types for MX team slots", async () => {
      // MX order: double1, double2, single1, single3, single2, single4, double3, double4
      // Expected:    D        D        S        S        S        S       MX       MX
      const mxEncounter = {
        ...mockEncounter,
        home: { type: SubEventTypeEnum.MX },
        getAssemblies: jest.fn().mockResolvedValue([]),
      };
      (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(mxEncounter);
      (Game.findAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      (Game.create as jest.Mock).mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: `game-${data["order"]}`, ...data })
      );
      (GamePlayerMembership.create as jest.Mock).mockResolvedValue({});
      (RankingSystem.findOne as jest.Mock).mockResolvedValue(null);

      await service.generateGames(encounterId);

      const expectedTypes = ["D", "D", "S", "S", "S", "S", "MX", "MX"];
      for (let i = 0; i < 8; i++) {
        expect(Game.create).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({ gameType: expectedTypes[i] }),
          expect.objectContaining({ transaction: expect.anything() })
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
