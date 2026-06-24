import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { getQueueToken } from "@nestjs/bull";
import { EncounterChange, EncounterCompetition, Player } from "@badman/backend-database";
import { SyncQueue } from "@badman/backend-queue";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { NotificationService } from "@badman/backend-notifications";
import { GraphQLError } from "graphql";
import { EncounterChangeCompetitionResolver } from "./encounter-change.resolver";
import { EncounterChangeService } from "./encounter-change.service";
import { ErrorCode } from "../../../utils/error-codes";

describe("EncounterChangeCompetitionResolver", () => {
  let resolver: EncounterChangeCompetitionResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockSyncQueue: { add: jest.Mock };
  let mockNotificationService: {
    notifyEncounterChange: jest.Mock;
    notifyEncounterChangeFinished: jest.Mock;
  };
  let mockEncounterService: object;
  let mockEncounterChangeService: {
    propose: jest.Mock;
    triage: jest.Mock;
    finalize: jest.Mock;
  };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockSyncQueue = { add: jest.fn().mockResolvedValue(undefined) };
    mockNotificationService = {
      notifyEncounterChange: jest.fn(),
      notifyEncounterChangeFinished: jest.fn(),
    };
    mockEncounterService = {};
    mockEncounterChangeService = {
      propose: jest.fn(),
      triage: jest.fn(),
      finalize: jest.fn(),
    };

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
        { provide: EncounterChangeService, useValue: mockEncounterChangeService },
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
      const result = await resolver.updateEncounterChange(buildUser(true), {
        id: "ec-uuid",
      } as any);
      expect(fakeChange.update).toHaveBeenCalled();
      expect(result).toBe(updated);
    });
  });

  // ---------------------------------------------------------------------------
  // T010: proposeEncounterChangeDates
  // ---------------------------------------------------------------------------
  describe("proposeEncounterChangeDates (mutation)", () => {
    const input = { encounterId: "enc-uuid", dates: [{ date: new Date("2026-11-15") }] };

    it("delegates to encounterChangeService.propose and returns result", async () => {
      const result = { encounterChange: { id: "ec-uuid" } } as any;
      mockEncounterChangeService.propose.mockResolvedValue(result);

      const actual = await resolver.proposeEncounterChangeDates(buildUser(true), input as any);

      expect(mockEncounterChangeService.propose).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-uuid" }),
        input
      );
      expect(actual).toBe(result);
    });

    it("propagates PERMISSION_DENIED from service", async () => {
      mockEncounterChangeService.propose.mockRejectedValue(
        new GraphQLError("denied", { extensions: { code: ErrorCode.PERMISSION_DENIED } })
      );
      await expect(
        resolver.proposeEncounterChangeDates(buildUser(false), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.PERMISSION_DENIED } });
    });

    it("propagates DEADLINE_PASSED from service", async () => {
      mockEncounterChangeService.propose.mockRejectedValue(
        new GraphQLError("deadline", { extensions: { code: ErrorCode.DEADLINE_PASSED } })
      );
      await expect(
        resolver.proposeEncounterChangeDates(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.DEADLINE_PASSED } });
    });

    it("propagates DATE_OUT_OF_SEASON from service", async () => {
      mockEncounterChangeService.propose.mockRejectedValue(
        new GraphQLError("season", { extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } })
      );
      await expect(
        resolver.proposeEncounterChangeDates(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } });
    });

    it("propagates DUPLICATE_DATE from service", async () => {
      mockEncounterChangeService.propose.mockRejectedValue(
        new GraphQLError("duplicate", { extensions: { code: ErrorCode.DUPLICATE_DATE } })
      );
      await expect(
        resolver.proposeEncounterChangeDates(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.DUPLICATE_DATE } });
    });
  });

  // ---------------------------------------------------------------------------
  // T012: triageEncounterChange
  // ---------------------------------------------------------------------------
  describe("triageEncounterChange (mutation)", () => {
    const input = {
      encounterChangeId: "ec-uuid",
      endorseIds: ["date-1"],
      rejectIds: ["date-2"],
      newDates: [{ date: new Date("2026-12-06") }],
    };

    it("delegates to encounterChangeService.triage and returns result", async () => {
      const result = { encounterChange: { id: "ec-uuid" } } as any;
      mockEncounterChangeService.triage.mockResolvedValue(result);

      const actual = await resolver.triageEncounterChange(buildUser(true), input as any);

      expect(mockEncounterChangeService.triage).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-uuid" }),
        input
      );
      expect(actual).toBe(result);
    });

    it("propagates PERMISSION_DENIED when home user calls triage", async () => {
      mockEncounterChangeService.triage.mockRejectedValue(
        new GraphQLError("home not allowed", { extensions: { code: ErrorCode.PERMISSION_DENIED } })
      );
      await expect(
        resolver.triageEncounterChange(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.PERMISSION_DENIED } });
    });

    it("propagates INVALID_STATE when endorsing a non-PENDING date", async () => {
      mockEncounterChangeService.triage.mockRejectedValue(
        new GraphQLError("invalid state", { extensions: { code: ErrorCode.INVALID_STATE } })
      );
      await expect(
        resolver.triageEncounterChange(buildUser(false), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.INVALID_STATE } });
    });

    it("propagates DATE_OUT_OF_SEASON for counter-dates outside season", async () => {
      mockEncounterChangeService.triage.mockRejectedValue(
        new GraphQLError("season", { extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } })
      );
      await expect(
        resolver.triageEncounterChange(buildUser(false), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } });
    });
  });

  // ---------------------------------------------------------------------------
  // T015: finalizeEncounterChange
  // ---------------------------------------------------------------------------
  describe("finalizeEncounterChange (mutation)", () => {
    const input = { encounterChangeDateId: "date-uuid" };

    it("delegates to encounterChangeService.finalize and returns result", async () => {
      const result = { encounter: { id: "enc-uuid" }, encounterChange: { id: "ec-uuid" } } as any;
      mockEncounterChangeService.finalize.mockResolvedValue(result);

      const actual = await resolver.finalizeEncounterChange(buildUser(true), input as any);

      expect(mockEncounterChangeService.finalize).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-uuid" }),
        input
      );
      expect(actual).toBe(result);
    });

    it("propagates PERMISSION_DENIED when away user calls finalize", async () => {
      mockEncounterChangeService.finalize.mockRejectedValue(
        new GraphQLError("away not allowed", { extensions: { code: ErrorCode.PERMISSION_DENIED } })
      );
      await expect(
        resolver.finalizeEncounterChange(buildUser(false), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.PERMISSION_DENIED } });
    });

    it("propagates DATE_NOT_ENDORSED when date is still PENDING", async () => {
      mockEncounterChangeService.finalize.mockRejectedValue(
        new GraphQLError("not endorsed", { extensions: { code: ErrorCode.DATE_NOT_ENDORSED } })
      );
      await expect(
        resolver.finalizeEncounterChange(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.DATE_NOT_ENDORSED } });
    });

    it("propagates VALIDATION_FAILED on location conflict", async () => {
      mockEncounterChangeService.finalize.mockRejectedValue(
        new GraphQLError("conflict", { extensions: { code: ErrorCode.VALIDATION_FAILED } })
      );
      await expect(
        resolver.finalizeEncounterChange(buildUser(true), input as any)
      ).rejects.toMatchObject({ extensions: { code: ErrorCode.VALIDATION_FAILED } });
    });
  });

  // ---------------------------------------------------------------------------
  // T018/T019: dates ResolveField — availability symbols pass-through
  // availabilityHome/availabilityAway are stored columns, not computed.
  // The dates() ResolveField calls getDates() and returns rows as-is.
  // ---------------------------------------------------------------------------
  describe("dates (ResolveField)", () => {
    it("returns dates via getDates() with stored availability values", async () => {
      const fakeDates = [
        { id: "d1", availabilityHome: "POSSIBLE", availabilityAway: "NOT_POSSIBLE" },
        { id: "d2", availabilityHome: "NOT_POSSIBLE", availabilityAway: "POSSIBLE" },
      ];
      const fakeChange = {
        getDates: jest.fn().mockResolvedValue(fakeDates),
      } as unknown as EncounterChange;

      const result = await resolver.dates(fakeChange);

      expect(fakeChange.getDates).toHaveBeenCalledTimes(1);
      expect(result[0].availabilityHome).toBe("POSSIBLE");
      expect(result[0].availabilityAway).toBe("NOT_POSSIBLE");
      expect(result[1].availabilityHome).toBe("NOT_POSSIBLE");
    });

    it("returns empty array when encounter change has no dates", async () => {
      const fakeChange = {
        getDates: jest.fn().mockResolvedValue([]),
      } as unknown as EncounterChange;

      const result = await resolver.dates(fakeChange);
      expect(result).toHaveLength(0);
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
        resolver.addChangeEncounter(buildUser(false), {
          encounterId: "enc-uuid",
          home: true,
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
