import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import {
  Player,
  RankingSystem,
  SubEventTournament,
  Game,
  DrawTournament,
} from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { SubEventTournamentResolver } from "./subevent.resolver";

describe("SubEventTournamentResolver", () => {
  let resolver: SubEventTournamentResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockSyncQueue: { add: jest.Mock };
  let mockRankingSystemService: { getPrimary: jest.Mock; getById: jest.Mock };
  let mockPointsService: { createRankingPointforGame: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockSyncQueue = { add: jest.fn() };
    mockRankingSystemService = { getPrimary: jest.fn(), getById: jest.fn() };
    mockPointsService = { createRankingPointforGame: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubEventTournamentResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: PointsService, useValue: mockPointsService },
        { provide: getQueueToken(SyncQueue), useValue: mockSyncQueue },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
      ],
    }).compile();

    resolver = module.get<SubEventTournamentResolver>(SubEventTournamentResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("subEventTournament (query)", () => {
    it("returns subEvent by id", async () => {
      const fakeSubEvent = { id: "se-uuid" } as unknown as SubEventTournament;
      jest.spyOn(SubEventTournament, "findByPk").mockResolvedValue(fakeSubEvent);
      expect(await resolver.subEventTournament("se-uuid")).toBe(fakeSubEvent);
    });

    it("throws NotFoundException when subEvent not found", async () => {
      jest.spyOn(SubEventTournament, "findByPk").mockResolvedValue(null);
      await expect(resolver.subEventTournament("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("subEventTournaments (query)", () => {
    it("returns list of subEvents", async () => {
      const list = [{ id: "se1" }] as unknown as SubEventTournament[];
      jest.spyOn(SubEventTournament, "findAll").mockResolvedValue(list);
      expect(await resolver.subEventTournaments({} as any)).toEqual(list);
    });
  });

  describe("recalculateSubEventTournamentwRankingPoints (mutation)", () => {
    it("throws UnauthorizedException when user lacks re-sync:points permission", async () => {
      await expect(
        resolver.recalculateSubEventTournamentwRankingPoints(
          buildUser(false),
          "se-uuid",
          "sys-uuid"
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when ranking system not found", async () => {
      mockRankingSystemService.getById.mockResolvedValue(null);
      await expect(
        resolver.recalculateSubEventTournamentwRankingPoints(buildUser(true), "se-uuid", "sys-uuid")
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("throws NotFoundException when subEvent not found", async () => {
      const fakeSystem = { id: "sys-uuid" } as unknown as RankingSystem;
      mockRankingSystemService.getById.mockResolvedValue(fakeSystem);
      jest.spyOn(SubEventTournament, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.recalculateSubEventTournamentwRankingPoints(buildUser(true), "se-uuid", "sys-uuid")
      ).rejects.toThrow(NotFoundException);
    });

    it("recalculates points across all draws and commits on success", async () => {
      const fakeSystem = { id: "sys-uuid" } as unknown as RankingSystem;
      mockRankingSystemService.getById.mockResolvedValue(fakeSystem);
      const fakeGame = { id: "g1" } as unknown as Game;
      const fakeDraw = { games: [fakeGame] } as unknown as DrawTournament;
      const fakeSubEvent = {
        getDrawTournaments: jest.fn().mockResolvedValue([fakeDraw]),
      } as unknown as SubEventTournament;
      jest.spyOn(SubEventTournament, "findByPk").mockResolvedValue(fakeSubEvent);
      mockPointsService.createRankingPointforGame.mockResolvedValue(undefined);
      const result = await resolver.recalculateSubEventTournamentwRankingPoints(
        buildUser(true),
        "se-uuid",
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

  describe("syncSubEvent (mutation)", () => {
    it("throws UnauthorizedException when user lacks sync:tournament permission", async () => {
      await expect(
        resolver.syncSubEvent(
          buildUser(false),
          null as any,
          null as any,
          "se-uuid",
          null as any,
          null as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws Error when no valid argument combination provided", async () => {
      await expect(
        resolver.syncSubEvent(
          buildUser(true),
          null as any,
          null as any,
          null as any,
          null as any,
          null as any
        )
      ).rejects.toThrow("Invalid arguments");
    });

    it("adds sync job and returns true when subEventId provided", async () => {
      const result = await resolver.syncSubEvent(
        buildUser(true),
        null as any,
        null as any,
        "se-uuid",
        null as any,
        null as any
      );
      expect(mockSyncQueue.add).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
