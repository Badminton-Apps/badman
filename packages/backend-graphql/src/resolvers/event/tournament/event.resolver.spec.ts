import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { EventTournament, Player } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { EventTournamentResolver } from "./event.resolver";

describe("EventTournamentResolver", () => {
  let resolver: EventTournamentResolver;
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
        EventTournamentResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: PointsService, useValue: mockPointsService },
        { provide: getQueueToken(SyncQueue), useValue: mockSyncQueue },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
      ],
    }).compile();

    resolver = module.get<EventTournamentResolver>(EventTournamentResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("eventTournament (query — UUID)", () => {
    it("finds by PK when id is a valid UUID", async () => {
      const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const fakeEvent = { id: uuid } as unknown as EventTournament;
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(fakeEvent);
      expect(await resolver.eventTournament(uuid)).toBe(fakeEvent);
    });

    it("finds by slug when id is not a UUID", async () => {
      const fakeEvent = { id: "some-id", slug: "autumn-cup-24" } as unknown as EventTournament;
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(null);
      jest.spyOn(EventTournament, "findOne").mockResolvedValue(fakeEvent);
      expect(await resolver.eventTournament("autumn-cup-24")).toBe(fakeEvent);
    });

    it("throws NotFoundException when not found by slug", async () => {
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(null);
      jest.spyOn(EventTournament, "findOne").mockResolvedValue(null);
      await expect(resolver.eventTournament("slug")).rejects.toThrow(NotFoundException);
    });
  });

  describe("eventTournaments (query)", () => {
    it("returns paged results", async () => {
      const result = { count: 1, rows: [{ id: "t1" }] } as any;
      jest.spyOn(EventTournament, "findAndCountAll").mockResolvedValue(result);
      expect(await resolver.eventTournaments({} as any)).toBe(result);
    });
  });

  describe("updateEventTournament (mutation)", () => {
    it("throws UnauthorizedException when user lacks edit-any:tournament permission", async () => {
      await expect(
        resolver.updateEventTournament(buildUser(false), { id: "t-uuid" } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when event not found", async () => {
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateEventTournament(buildUser(true), { id: "missing" } as any)
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("updates event and commits when official flag unchanged", async () => {
      const fakeEvent = {
        id: "t-uuid",
        official: false,
        update: jest.fn().mockResolvedValue({ id: "t-uuid" }),
        getSubEventTournaments: jest.fn().mockResolvedValue([]),
      } as unknown as EventTournament;
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(fakeEvent);
      const result = await resolver.updateEventTournament(buildUser(true), {
        id: "t-uuid",
        official: false,
      } as any);
      expect(fakeEvent.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ id: "t-uuid" });
    });

    it("rolls back on error", async () => {
      const fakeEvent = {
        id: "t-uuid",
        official: false,
        update: jest.fn().mockRejectedValue(new Error("db fail")),
        getSubEventTournaments: jest.fn().mockResolvedValue([]),
      } as unknown as EventTournament;
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(fakeEvent);
      await expect(
        resolver.updateEventTournament(buildUser(true), { id: "t-uuid", official: false } as any)
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("removeEventTournament (mutation)", () => {
    it("throws UnauthorizedException when user lacks delete-any:tournament permission", async () => {
      await expect(resolver.removeEventTournament(buildUser(false), "t-uuid")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when event not found", async () => {
      jest.spyOn(EventTournament, "findByPk").mockResolvedValue(null);
      await expect(resolver.removeEventTournament(buildUser(true), "missing")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("syncEvent (mutation)", () => {
    it("throws UnauthorizedException when user lacks sync:tournament permission", async () => {
      await expect(
        resolver.syncEvent(buildUser(false), "t-uuid", null as any, null as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("adds job to sync queue and returns true", async () => {
      const result = await resolver.syncEvent(buildUser(true), "t-uuid", null as any, null as any);
      expect(mockSyncQueue.add).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
