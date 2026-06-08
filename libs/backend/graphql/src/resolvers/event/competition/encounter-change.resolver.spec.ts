import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { EncounterChange, EncounterCompetition, Player } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { NotificationService } from "@badman/backend-notifications";
import { EncounterChangeCompetitionResolver } from "./encounter-change.resolver";

describe("EncounterChangeCompetitionResolver", () => {
  let resolver: EncounterChangeCompetitionResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockSyncQueue: { add: jest.Mock };
  let mockNotificationService: {
    notifyEncounterChange: jest.Mock;
    notifyEncounterChangeFinished: jest.Mock;
  };
  let mockEncounterService: {};

  const buildUser = (allowed: boolean) =>
    ({ id: "user-uuid", hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockSyncQueue = { add: jest.fn().mockResolvedValue(undefined) };
    mockNotificationService = {
      notifyEncounterChange: jest.fn(),
      notifyEncounterChangeFinished: jest.fn(),
    };
    mockEncounterService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncounterChangeCompetitionResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: getQueueToken(SyncQueue), useValue: mockSyncQueue },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: EncounterValidationService, useValue: mockEncounterService },
      ],
    }).compile();

    resolver = module.get<EncounterChangeCompetitionResolver>(EncounterChangeCompetitionResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("encounterChange (query)", () => {
    it("returns encounter change by id", async () => {
      const fakeChange = { id: "ec-uuid" } as unknown as EncounterChange;
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(fakeChange);
      expect(await resolver.encounterChange("ec-uuid")).toBe(fakeChange);
    });

    it("throws NotFoundException when encounter change not found", async () => {
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(null);
      await expect(resolver.encounterChange("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("encounterChanges (query)", () => {
    it("returns paged encounter changes", async () => {
      const result = { count: 1, rows: [{ id: "ec1" }] } as any;
      jest.spyOn(EncounterChange, "findAndCountAll").mockResolvedValue(result);
      expect(await resolver.encounterChanges({} as any)).toBe(result);
    });
  });

  describe("updateEncounterChange (mutation)", () => {
    it("throws NotFoundException when encounter change not found", async () => {
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateEncounterChange(buildUser(true), { id: "missing" } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when encounter not found", async () => {
      const fakeChange = { id: "ec-uuid", encounterId: "enc-uuid" } as unknown as EncounterChange;
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(fakeChange);
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateEncounterChange(buildUser(true), { id: "ec-uuid" } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UnauthorizedException when user lacks change:encounter for both clubs", async () => {
      const fakeChange = { id: "ec-uuid", encounterId: "enc-uuid" } as unknown as EncounterChange;
      const fakeHome = { clubId: "home-club" };
      const fakeAway = { clubId: "away-club" };
      const fakeEncounter = {
        getHome: jest.fn().mockResolvedValue(fakeHome),
        getAway: jest.fn().mockResolvedValue(fakeAway),
      } as unknown as EncounterCompetition;
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(fakeChange);
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(fakeEncounter);
      await expect(
        resolver.updateEncounterChange(buildUser(false), { id: "ec-uuid" } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("updates encounter change and returns result when user has permission", async () => {
      const updated = { id: "ec-uuid", status: "accepted" };
      const fakeChange = {
        id: "ec-uuid",
        encounterId: "enc-uuid",
        update: jest.fn().mockResolvedValue(updated),
      } as unknown as EncounterChange;
      const fakeHome = { clubId: "home-club" };
      const fakeAway = { clubId: "away-club" };
      const fakeEncounter = {
        getHome: jest.fn().mockResolvedValue(fakeHome),
        getAway: jest.fn().mockResolvedValue(fakeAway),
      } as unknown as EncounterCompetition;
      jest.spyOn(EncounterChange, "findByPk").mockResolvedValue(fakeChange);
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(fakeEncounter);
      const result = await resolver.updateEncounterChange(buildUser(true), { id: "ec-uuid" } as any);
      expect(fakeChange.update).toHaveBeenCalled();
      expect(result).toBe(updated);
    });
  });

  describe("addChangeEncounter (mutation)", () => {
    it("throws NotFoundException when encounter not found", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.addChangeEncounter(buildUser(true), { encounterId: "missing", home: true } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when team not found in encounter", async () => {
      const fakeEncounter = { home: null, away: null } as unknown as EncounterCompetition;
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(fakeEncounter);
      await expect(
        resolver.addChangeEncounter(buildUser(true), { encounterId: "enc-uuid", home: true } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UnauthorizedException when user lacks change:encounter permission", async () => {
      const fakeTeam = { clubId: "club-uuid" };
      const fakeEncounter = { home: fakeTeam, away: null } as unknown as EncounterCompetition;
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(fakeEncounter);
      await expect(
        resolver.addChangeEncounter(buildUser(false), { encounterId: "enc-uuid", home: true } as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
