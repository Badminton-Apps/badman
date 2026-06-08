import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { DrawTournament, Player, RankingSystem } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { DrawTournamentResolver } from "./draw.resolver";

describe("DrawTournamentResolver", () => {
  let resolver: DrawTournamentResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockSyncQueue: { add: jest.Mock };
  let mockRankingSystemService: { getPrimary: jest.Mock; getById: jest.Mock };
  let mockPointsService: { createRankingPointforGame: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({ id: "user-uuid", hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockSyncQueue = { add: jest.fn() };
    mockRankingSystemService = { getPrimary: jest.fn(), getById: jest.fn() };
    mockPointsService = { createRankingPointforGame: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawTournamentResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: PointsService, useValue: mockPointsService },
        { provide: getQueueToken(SyncQueue), useValue: mockSyncQueue },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
      ],
    }).compile();

    resolver = module.get<DrawTournamentResolver>(DrawTournamentResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("drawTournament (query)", () => {
    it("returns draw by id", async () => {
      const fakeDraw = { id: "d-uuid" } as unknown as DrawTournament;
      jest.spyOn(DrawTournament, "findByPk").mockResolvedValue(fakeDraw);
      expect(await resolver.drawTournament("d-uuid")).toBe(fakeDraw);
    });

    it("throws NotFoundException when draw not found", async () => {
      jest.spyOn(DrawTournament, "findByPk").mockResolvedValue(null);
      await expect(resolver.drawTournament("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("drawTournaments (query)", () => {
    it("returns list of draws", async () => {
      const list = [{ id: "d1" }] as unknown as DrawTournament[];
      jest.spyOn(DrawTournament, "findAll").mockResolvedValue(list);
      expect(await resolver.drawTournaments({} as any)).toEqual(list);
    });
  });

  describe("recalculateDrawTournamentRankingPoints (mutation)", () => {
    it("throws UnauthorizedException when user lacks re-sync:points permission", async () => {
      await expect(
        resolver.recalculateDrawTournamentRankingPoints(buildUser(false), "d-uuid", "sys-uuid")
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when ranking system not found", async () => {
      mockRankingSystemService.getById.mockResolvedValue(null);
      await expect(
        resolver.recalculateDrawTournamentRankingPoints(buildUser(true), "d-uuid", "sys-uuid")
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("throws NotFoundException when draw not found", async () => {
      const fakeSystem = { id: "sys-uuid" } as unknown as RankingSystem;
      mockRankingSystemService.getById.mockResolvedValue(fakeSystem);
      jest.spyOn(DrawTournament, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.recalculateDrawTournamentRankingPoints(buildUser(true), "d-uuid", "sys-uuid")
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("recalculates points and commits on success", async () => {
      const fakeSystem = { id: "sys-uuid" } as unknown as RankingSystem;
      mockRankingSystemService.getById.mockResolvedValue(fakeSystem);
      const fakeGame = { id: "g1" };
      const fakeDraw = { getGames: jest.fn().mockResolvedValue([fakeGame]) } as unknown as DrawTournament;
      jest.spyOn(DrawTournament, "findByPk").mockResolvedValue(fakeDraw);
      mockPointsService.createRankingPointforGame.mockResolvedValue(undefined);
      const result = await resolver.recalculateDrawTournamentRankingPoints(
        buildUser(true),
        "d-uuid",
        "sys-uuid"
      );
      expect(mockPointsService.createRankingPointforGame).toHaveBeenCalledWith(
        fakeSystem,
        fakeGame,
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("syncDraw (mutation)", () => {
    it("throws UnauthorizedException when user lacks sync:tournament permission", async () => {
      await expect(
        resolver.syncDraw(buildUser(false), "d-uuid", null as any, null as any, null as any, null as any, null as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws Error when no valid argument combination provided", async () => {
      await expect(
        resolver.syncDraw(buildUser(true), null as any, null as any, null as any, null as any, null as any, null as any)
      ).rejects.toThrow("Invalid arguments");
    });

    it("adds sync job and returns true when drawId provided", async () => {
      const result = await resolver.syncDraw(
        buildUser(true),
        "d-uuid",
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      expect(mockSyncQueue.add).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
