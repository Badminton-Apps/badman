import { Test, TestingModule } from "@nestjs/testing";
import {
  DrawCompetition,
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  Logging,
  Player,
  Team,
} from "@badman/backend-database";
import { getQueueToken } from "@nestjs/bull";
import { Sequelize } from "sequelize-typescript";
import { EncounterCompetitionResolver } from "./encounter.resolver";
import { DrawCompetitionLoaderService } from "../../../loaders/draw-competition-loader.service";
import { TeamLoaderService } from "../../../loaders/team-loader.service";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { EncounterGamesGenerationService } from "@badman/backend-encounter-games";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { NotificationService } from "@badman/backend-notifications";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { EncounterChangeService } from "./encounter-change.service";
import {
  ChangeEncounterDateStatus,
  ChangeEncounterParty,
  EncounterChangeViewState,
} from "@badman/utils";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";

describe("EncounterCompetitionResolver — DataLoader field resolvers", () => {
  let resolver: EncounterCompetitionResolver;
  let teamLoaderService: TeamLoaderService;
  let drawLoaderService: DrawCompetitionLoaderService;
  let syncQueue: { add: jest.Mock };
  let notificationService: { notifyEncounterChangeFinished: jest.Mock };
  let encounterChangeService: { resolveProposalsForAdminChange: jest.Mock };

  const makeEncounter = (overrides: Partial<EncounterCompetition> = {}) =>
    ({
      id: "enc-uuid",
      homeTeamId: "home-team-uuid",
      awayTeamId: "away-team-uuid",
      drawId: "draw-uuid",
      ...overrides,
    }) as unknown as EncounterCompetition;

  beforeEach(async () => {
    syncQueue = { add: jest.fn() };
    notificationService = { notifyEncounterChangeFinished: jest.fn() };
    encounterChangeService = {
      resolveProposalsForAdminChange: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncounterCompetitionResolver,
        {
          provide: getQueueToken(SyncQueue),
          useValue: syncQueue,
        },
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue({
              commit: jest.fn().mockResolvedValue(undefined),
              rollback: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: PointsService,
          useValue: {},
        },
        {
          provide: EncounterValidationService,
          useValue: {},
        },
        {
          provide: EncounterGamesGenerationService,
          useValue: {},
        },
        {
          provide: RankingSystemService,
          useValue: {},
        },
        {
          provide: TeamLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: DrawCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: notificationService,
        },
        {
          provide: EncounterChangeService,
          useValue: encounterChangeService,
        },
      ],
    }).compile();

    resolver = module.get<EncounterCompetitionResolver>(EncounterCompetitionResolver);
    teamLoaderService = module.get<TeamLoaderService>(TeamLoaderService);
    drawLoaderService = module.get<DrawCompetitionLoaderService>(DrawCompetitionLoaderService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("home field resolver", () => {
    it("calls teamLoader.load with encounter.homeTeamId", async () => {
      const encounter = makeEncounter({ homeTeamId: "home-team-uuid" });
      const fakeTeam = { id: "home-team-uuid" } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);

      const result = await resolver.home(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith("home-team-uuid");
      expect(result).toBe(fakeTeam);
    });

    it("returns null when homeTeamId is null", async () => {
      const encounter = makeEncounter({ homeTeamId: undefined });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.home(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(teamLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.home(encounter);

      expect(result).toBeNull();
    });
  });

  describe("away field resolver", () => {
    it("calls teamLoader.load with encounter.awayTeamId", async () => {
      const encounter = makeEncounter({ awayTeamId: "away-team-uuid" });
      const fakeTeam = { id: "away-team-uuid" } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);

      const result = await resolver.away(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith("away-team-uuid");
      expect(result).toBe(fakeTeam);
    });

    it("returns null when awayTeamId is null", async () => {
      const encounter = makeEncounter({ awayTeamId: undefined });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.away(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(teamLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.away(encounter);

      expect(result).toBeNull();
    });
  });

  describe("drawCompetition field resolver", () => {
    it("calls drawLoader.load with encounter.drawId", async () => {
      const encounter = makeEncounter({ drawId: "draw-uuid" });
      const fakeDraw = { id: "draw-uuid" } as unknown as DrawCompetition;
      jest.spyOn(drawLoaderService, "load").mockResolvedValue(fakeDraw);

      const result = await resolver.drawCompetition(encounter);

      expect(drawLoaderService.load).toHaveBeenCalledWith("draw-uuid");
      expect(result).toBe(fakeDraw);
    });

    it("returns null when drawId is null", async () => {
      const encounter = makeEncounter({ drawId: undefined });
      jest.spyOn(drawLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.drawCompetition(encounter);

      expect(drawLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(drawLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.drawCompetition(encounter);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // T017: changeStatus ResolveField
  // ---------------------------------------------------------------------------
  describe("changeStatus field resolver", () => {
    const homeTeam = { id: "home-team-uuid", clubId: "home-club-uuid" } as unknown as Team;

    const buildUser = (isHome: boolean) =>
      ({
        id: "user-uuid",
        hasAnyPermission: jest.fn().mockResolvedValue(isHome),
      }) as unknown as Player;

    const makeChange = (
      lastActionBy: ChangeEncounterParty,
      dates: Partial<EncounterChangeDate>[]
    ) =>
      ({
        lastActionBy,
        dates: dates as EncounterChangeDate[],
      }) as unknown as EncounterChange;

    const makeDate = (status: ChangeEncounterDateStatus | null) =>
      ({ status }) as unknown as EncounterChangeDate;

    const makeEncounterWithChange = (change: EncounterChange | null) => {
      jest.spyOn(EncounterChange, "findOne").mockResolvedValue(change);
      return {
        id: "enc-uuid",
        homeTeamId: "home-team-uuid",
      } as unknown as EncounterCompetition;
    };

    beforeEach(() => {
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(homeTeam);
    });

    it("returns null when no EncounterChange exists", async () => {
      const encounter = makeEncounterWithChange(null);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBeNull();
    });

    it("returns MOVED when any date has ACCEPTED status", async () => {
      const change = makeChange(ChangeEncounterParty.AWAY, [
        makeDate(ChangeEncounterDateStatus.ACCEPTED),
        makeDate(ChangeEncounterDateStatus.RESOLVED),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.MOVED
      );
    });

    it("returns PROPOSAL_SENT when live dates exist and lastActionBy === viewer (HOME)", async () => {
      const change = makeChange(ChangeEncounterParty.HOME, [
        makeDate(ChangeEncounterDateStatus.PENDING),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.PROPOSAL_SENT
      );
    });

    it("returns ACTION_REQUIRED when live dates exist and lastActionBy !== viewer (HOME viewing, AWAY acted last)", async () => {
      const change = makeChange(ChangeEncounterParty.AWAY, [
        makeDate(ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.ACTION_REQUIRED
      );
    });

    it("returns ACTION_REQUIRED when no live dates and lastActionBy === viewer (viewer rejected, owes new dates)", async () => {
      const change = makeChange(ChangeEncounterParty.HOME, [
        makeDate(ChangeEncounterDateStatus.REJECTED),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.ACTION_REQUIRED
      );
    });

    it("returns REJECTED_WAITING when no live dates and lastActionBy !== viewer (other party rejected)", async () => {
      const change = makeChange(ChangeEncounterParty.AWAY, [
        makeDate(ChangeEncounterDateStatus.REJECTED),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.REJECTED_WAITING
      );
    });

    it("returns null for user with no club permission (non-participant)", async () => {
      const anonUser = buildUser(false);
      const change = makeChange(ChangeEncounterParty.AWAY, [
        makeDate(ChangeEncounterDateStatus.PENDING),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, anonUser)).toBeNull();
    });

    it("returns MOVED for admin user (change-any:encounter) when a date is ACCEPTED", async () => {
      const adminUser = {
        id: "admin-uuid",
        hasAnyPermission: jest.fn().mockResolvedValue(true),
      } as unknown as Player;
      const change = makeChange(ChangeEncounterParty.HOME, [
        makeDate(ChangeEncounterDateStatus.ACCEPTED),
        makeDate(ChangeEncounterDateStatus.RESOLVED),
      ]);
      const encounter = makeEncounterWithChange(change);
      expect(await resolver.changeStatus(encounter, adminUser)).toBe(
        EncounterChangeViewState.MOVED
      );
    });

    it("skips historical dates (null status) when deriving state", async () => {
      const change = makeChange(ChangeEncounterParty.HOME, [
        makeDate(null),
        makeDate(ChangeEncounterDateStatus.PENDING),
      ]);
      const encounter = makeEncounterWithChange(change);
      // Only the PENDING date counts; HOME acted last, viewer is HOME → PROPOSAL_SENT
      expect(await resolver.changeStatus(encounter, buildUser(true))).toBe(
        EncounterChangeViewState.PROPOSAL_SENT
      );
    });
  });

  describe("home + away batching via shared TeamLoaderService", () => {
    it("uses the same teamLoader instance for both home and away calls", async () => {
      const homeEncounter = makeEncounter({ homeTeamId: "team-1" });
      const awayEncounter = makeEncounter({ awayTeamId: "team-2" });
      const teamA = { id: "team-1" } as unknown as Team;
      const teamB = { id: "team-2" } as unknown as Team;

      const loadSpy = jest
        .spyOn(teamLoaderService, "load")
        .mockImplementation(async (id) => (id === "team-1" ? teamA : teamB));

      const [homeResult, awayResult] = await Promise.all([
        resolver.home(homeEncounter),
        resolver.away(awayEncounter),
      ]);

      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(loadSpy).toHaveBeenCalledWith("team-1");
      expect(loadSpy).toHaveBeenCalledWith("team-2");
      expect(homeResult).toBe(teamA);
      expect(awayResult).toBe(teamB);
    });
  });

  // ---------------------------------------------------------------------------
  // adminChangeEncounterDate mutation
  // ---------------------------------------------------------------------------
  describe("adminChangeEncounterDate", () => {
    const adminUser = {
      id: "admin-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(true),
    } as unknown as Player;

    const unauthorizedUser = {
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(false),
    } as unknown as Player;

    const newDate = new Date("2025-11-15T13:00:00Z");

    function makeDbEncounter(overrides: Partial<EncounterCompetition> = {}) {
      return {
        id: "enc-uuid",
        locationId: "loc-uuid",
        originalDate: new Date("2025-10-05T12:00:00Z"),
        update: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      } as unknown as EncounterCompetition;
    }

    it("throws NotFoundException when encounter does not exist", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);

      await expect(
        resolver.adminChangeEncounterDate(adminUser, "missing-id", newDate, undefined, true, false)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UnauthorizedException when user lacks change-any:encounter", async () => {
      const encounter = makeDbEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

      await expect(
        resolver.adminChangeEncounterDate(
          unauthorizedUser,
          "enc-uuid",
          newDate,
          undefined,
          true,
          false
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it("updateBadman=true: updates date, resolves proposals, creates Logging entry, commits, notifies and returns encounter", async () => {
      const encounter = makeDbEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

      const result = await resolver.adminChangeEncounterDate(
        adminUser,
        "enc-uuid",
        newDate,
        undefined,
        true,
        false
      );

      expect(result).toBe(encounter);
      expect(encounter.update).toHaveBeenCalledWith({ date: newDate }, expect.any(Object));
      expect(encounterChangeService.resolveProposalsForAdminChange).toHaveBeenCalledWith(
        "enc-uuid",
        newDate,
        "loc-uuid", // falls back to encounter.locationId
        expect.any(Object) // transaction
      );
      expect(loggingCreate).toHaveBeenCalledWith(
        expect.objectContaining({ meta: expect.objectContaining({ date: newDate }) }),
        expect.any(Object)
      );
      expect(notificationService.notifyEncounterChangeFinished).toHaveBeenCalledWith(
        encounter,
        false // location not changed
      );
    });

    it("updateBadman=true with new locationId: updates location and flags locationChanged=true", async () => {
      const encounter = makeDbEncounter({ locationId: "old-loc" });
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

      await resolver.adminChangeEncounterDate(
        adminUser,
        "enc-uuid",
        newDate,
        "new-loc",
        true,
        false
      );

      expect(encounter.update).toHaveBeenCalledWith(
        { date: newDate, locationId: "new-loc" },
        expect.any(Object)
      );
      expect(notificationService.notifyEncounterChangeFinished).toHaveBeenCalledWith(
        encounter,
        true // location changed
      );
    });

    it("updateBadman=false: skips DB update and notifications", async () => {
      const encounter = makeDbEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

      await resolver.adminChangeEncounterDate(
        adminUser,
        "enc-uuid",
        newDate,
        undefined,
        false,
        false
      );

      expect(encounter.update).not.toHaveBeenCalled();
      expect(loggingCreate).not.toHaveBeenCalled();
      expect(notificationService.notifyEncounterChangeFinished).not.toHaveBeenCalled();
    });

    it("updateVisual=true: queues Sync.ChangeDate job", async () => {
      const encounter = makeDbEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

      await resolver.adminChangeEncounterDate(
        adminUser,
        "enc-uuid",
        newDate,
        undefined,
        false,
        true
      );

      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.ChangeDate,
        { encounterId: "enc-uuid" },
        expect.any(Object)
      );
    });

    it("updateVisual=false: does not queue any sync job", async () => {
      const encounter = makeDbEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

      await resolver.adminChangeEncounterDate(
        adminUser,
        "enc-uuid",
        newDate,
        undefined,
        true,
        false
      );

      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("rolls back transaction on DB error", async () => {
      const encounter = makeDbEncounter();
      encounter.update = jest.fn().mockRejectedValue(new Error("DB failure"));
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

      const sequelize = resolver["_sequelize"] as unknown as {
        transaction: jest.Mock;
      };
      const tx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(tx);

      await expect(
        resolver.adminChangeEncounterDate(adminUser, "enc-uuid", newDate, undefined, true, false)
      ).rejects.toThrow("DB failure");

      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });
});
