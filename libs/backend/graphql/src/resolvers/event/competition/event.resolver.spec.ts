import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { EventCompetition, Player } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { EventCompetitionResolver } from "./event.resolver";

describe("EventCompetitionResolver", () => {
  let resolver: EventCompetitionResolver;
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
        EventCompetitionResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: PointsService, useValue: mockPointsService },
        { provide: getQueueToken(SyncQueue), useValue: mockSyncQueue },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
      ],
    }).compile();

    resolver = module.get<EventCompetitionResolver>(EventCompetitionResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("eventCompetition (query — UUID)", () => {
    it("finds by PK when id is a valid UUID", async () => {
      const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const fakeEvent = { id: uuid } as unknown as EventCompetition;
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(fakeEvent);
      expect(await resolver.eventCompetition(uuid)).toBe(fakeEvent);
    });

    it("finds by slug when id is not a UUID", async () => {
      const fakeEvent = { id: "some-id", slug: "spring-2024" } as unknown as EventCompetition;
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      jest.spyOn(EventCompetition, "findOne").mockResolvedValue(fakeEvent);
      expect(await resolver.eventCompetition("spring-2024")).toBe(fakeEvent);
    });

    it("throws NotFoundException when not found by slug", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      jest.spyOn(EventCompetition, "findOne").mockResolvedValue(null);
      await expect(resolver.eventCompetition("slug")).rejects.toThrow(NotFoundException);
    });
  });

  describe("eventCompetitions (query)", () => {
    it("returns paged results", async () => {
      const result = { count: 1, rows: [{ id: "e1" }] } as any;
      jest.spyOn(EventCompetition, "findAndCountAll").mockResolvedValue(result);
      expect(await resolver.eventCompetitions({} as any)).toBe(result);
    });
  });

  describe("updateEventCompetition (mutation)", () => {
    it("throws UnauthorizedException when user lacks edit:competition permission", async () => {
      await expect(
        resolver.updateEventCompetition(buildUser(false), { id: "e-uuid" } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when event not found", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateEventCompetition(buildUser(true), { id: "missing" } as any)
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("updates event and commits on success", async () => {
      const fakeEvent = {
        id: "e-uuid",
        official: false,
        update: jest.fn().mockResolvedValue({ id: "e-uuid" }),
        getSubEventCompetitions: jest.fn().mockResolvedValue([]),
      } as unknown as EventCompetition;
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(fakeEvent);
      const result = await resolver.updateEventCompetition(buildUser(true), { id: "e-uuid" } as any);
      expect(fakeEvent.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ id: "e-uuid" });
    });

    it("rolls back on error", async () => {
      const fakeEvent = {
        id: "e-uuid",
        official: false,
        update: jest.fn().mockRejectedValue(new Error("db fail")),
        getSubEventCompetitions: jest.fn().mockResolvedValue([]),
      } as unknown as EventCompetition;
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(fakeEvent);
      await expect(
        resolver.updateEventCompetition(buildUser(true), { id: "e-uuid" } as any)
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("removeEventCompetition (mutation)", () => {
    it("throws UnauthorizedException when user lacks delete:competition permission", async () => {
      await expect(resolver.removeEventCompetition(buildUser(false), "e-uuid")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when event not found", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      await expect(resolver.removeEventCompetition(buildUser(true), "missing")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("recalculateStandingEvent (mutation)", () => {
    it("throws UnauthorizedException when user lacks re-sync:points permission", async () => {
      await expect(
        resolver.recalculateStandingEvent(buildUser(false), "e-uuid")
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when event not found", async () => {
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.recalculateStandingEvent(buildUser(true), "missing")
      ).rejects.toThrow(NotFoundException);
    });

    it("adds sync job and returns true", async () => {
      const fakeEvent = { id: "e-uuid" } as unknown as EventCompetition;
      jest.spyOn(EventCompetition, "findByPk").mockResolvedValue(fakeEvent);
      const result = await resolver.recalculateStandingEvent(buildUser(true), "e-uuid");
      expect(mockSyncQueue.add).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
