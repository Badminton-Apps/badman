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
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";

describe("EncounterCompetitionResolver — DataLoader field resolvers", () => {
  let resolver: EncounterCompetitionResolver;
  let teamLoaderService: TeamLoaderService;
  let drawLoaderService: DrawCompetitionLoaderService;
  let syncQueue: { add: jest.Mock; getJob: jest.Mock };
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
    syncQueue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(null) };
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

  describe("encounter staff authorization", () => {
    const buildUser = (id: string | undefined, allowed = false) =>
      ({ id, hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

    const makeDbEncounter = (overrides: Partial<EncounterCompetition> = {}) =>
      ({
        id: "enc-uuid",
        gameLeaderId: "leader-uuid",
        tempHomeCaptainId: "temp-home-uuid",
        tempAwayCaptainId: "temp-away-uuid",
        home: { clubId: "home-club", captainId: "home-captain-uuid" },
        away: { clubId: "away-club", captainId: "away-captain-uuid" },
        update: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      }) as unknown as EncounterCompetition;

    const transaction = () =>
      (resolver["_sequelize"] as unknown as { transaction: jest.Mock }).transaction.mock.results[0]
        .value as Promise<{ commit: jest.Mock; rollback: jest.Mock }>;

    describe("updateGameLeader", () => {
      const call = (user: Player) => resolver.updateGameLeader(user, "enc-uuid", "new-leader-uuid");

      it("throws NotFoundException when encounter does not exist", async () => {
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
        await expect(call(buildUser("admin-uuid", true))).rejects.toThrow(NotFoundException);
      });

      it.each([
        ["a stranger", "stranger-uuid"],
        ["the away captain", "away-captain-uuid"],
        ["the away temporary captain", "temp-away-uuid"],
        ["an anonymous caller", undefined],
      ])("rejects %s without a home-side permission", async (_role, userId) => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
        const user = buildUser(userId);

        await expect(call(user)).rejects.toThrow(UnauthorizedException);

        expect(user.hasAnyPermission).toHaveBeenCalledWith([
          "change-any:encounter",
          "home-club_enter:results",
        ]);
        expect(encounter.update).not.toHaveBeenCalled();
        const tx = await transaction();
        expect(tx.rollback).toHaveBeenCalled();
        expect(tx.commit).not.toHaveBeenCalled();
      });

      it("allows a user with a home-side permission", async () => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

        await expect(call(buildUser("club-admin-uuid", true))).resolves.toBe(true);

        expect(encounter.update).toHaveBeenCalledWith(
          { gameLeaderId: "new-leader-uuid" },
          expect.any(Object)
        );
        expect((await transaction()).commit).toHaveBeenCalled();
      });

      it.each([
        ["the game leader", "leader-uuid"],
        ["the home captain", "home-captain-uuid"],
        ["the home temporary captain", "temp-home-uuid"],
      ])("allows %s without any permission", async (_role, userId) => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
        const user = buildUser(userId);

        await expect(call(user)).resolves.toBe(true);
        expect(user.hasAnyPermission).not.toHaveBeenCalled();
      });
    });

    describe("updateTempTeamCaptain", () => {
      it("throws NotFoundException when encounter does not exist", async () => {
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
        await expect(
          resolver.updateTempTeamCaptain(buildUser("admin-uuid", true), "enc-uuid", {
            tempHomeCaptainId: "x",
          })
        ).rejects.toThrow(NotFoundException);
      });

      it("rejects input that sets neither side", async () => {
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
        await expect(
          resolver.updateTempTeamCaptain(buildUser("admin-uuid", true), "enc-uuid", {})
        ).rejects.toThrow(BadRequestException);
      });

      it.each([
        ["a stranger", "stranger-uuid", { tempHomeCaptainId: "x" }, "home-club"],
        ["an anonymous caller", undefined, { tempAwayCaptainId: "x" }, "away-club"],
        // Without side scoping, a captain could make themselves the other side's temp captain
        // and then edit that team's assembly.
        [
          "the home captain on the away side",
          "home-captain-uuid",
          { tempAwayCaptainId: "home-captain-uuid" },
          "away-club",
        ],
        [
          "the away temporary captain on the home side",
          "temp-away-uuid",
          { tempHomeCaptainId: "x" },
          "home-club",
        ],
      ])("rejects %s, without updating", async (_role, userId, data, clubId) => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
        const user = buildUser(userId);

        await expect(resolver.updateTempTeamCaptain(user, "enc-uuid", data)).rejects.toThrow(
          UnauthorizedException
        );

        expect(user.hasAnyPermission).toHaveBeenCalledWith([
          "change-any:encounter",
          `${clubId}_enter:results`,
        ]);
        expect(encounter.update).not.toHaveBeenCalled();
        expect((await transaction()).rollback).toHaveBeenCalled();
      });

      it("rejects when only one of two requested sides is allowed", async () => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

        await expect(
          resolver.updateTempTeamCaptain(buildUser("home-captain-uuid"), "enc-uuid", {
            tempHomeCaptainId: "x",
            tempAwayCaptainId: "y",
          })
        ).rejects.toThrow(UnauthorizedException);
        expect(encounter.update).not.toHaveBeenCalled();
      });

      it.each([
        ["the home captain", "home-captain-uuid", { tempHomeCaptainId: "x" }],
        ["the away captain", "away-captain-uuid", { tempAwayCaptainId: "x" }],
        ["the away temporary captain", "temp-away-uuid", { tempAwayCaptainId: null }],
        // The encounter form lets the game leader set both captains.
        [
          "the game leader on both sides",
          "leader-uuid",
          { tempHomeCaptainId: "x", tempAwayCaptainId: "y" },
        ],
      ])("allows %s without any permission", async (_role, userId, data) => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
        const user = buildUser(userId);

        await expect(resolver.updateTempTeamCaptain(user, "enc-uuid", data as never)).resolves.toBe(
          true
        );

        expect(user.hasAnyPermission).not.toHaveBeenCalled();
        expect(encounter.update).toHaveBeenCalledWith(data, expect.any(Object));
        expect((await transaction()).commit).toHaveBeenCalled();
      });

      it("allows a user with that side's club permission", async () => {
        const encounter = makeDbEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

        await expect(
          resolver.updateTempTeamCaptain(buildUser("club-admin-uuid", true), "enc-uuid", {
            tempAwayCaptainId: "x",
          })
        ).resolves.toBe(true);
      });
    });
  });

  describe("updateEncounterCompetition", () => {
    const resultEnterer = {
      id: "leader-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(true),
    } as unknown as Player;

    const outsider = {
      id: "outsider-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(false),
    } as unknown as Player;

    const confirm = { finished: true, enteredOn: new Date("2026-10-29T20:00:00Z") };

    function makeDbEncounter(overrides: Record<string, unknown> = {}) {
      const encounter = {
        id: "enc-uuid",
        visualCode: "VC001",
        finished: false,
        enteredOn: null,
        scoresSyncedAt: null,
        gameLeaderId: "leader-uuid",
        home: { clubId: "home-club" },
        away: { clubId: "away-club" },
        toJSON: () => ({ id: "enc-uuid" }),
        ...overrides,
      } as unknown as EncounterCompetition;
      // Like Sequelize, update() resolves to the instance itself.
      encounter.update = jest.fn().mockResolvedValue(encounter);
      return encounter;
    }

    function useTransaction(commit: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
      const tx = { commit, rollback: jest.fn().mockResolvedValue(undefined) };
      (
        resolver["_sequelize"] as unknown as { transaction: jest.Mock }
      ).transaction.mockResolvedValue(tx);
      return tx;
    }

    it("rejects a user without result rights and never touches the queue", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
      const tx = useTransaction();

      await expect(
        resolver.updateEncounterCompetition(outsider, "enc-uuid", { ...confirm })
      ).rejects.toThrow(UnauthorizedException);

      expect(tx.commit).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("requests the toernooi.nl push only after the result is committed", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
      const tx = useTransaction();

      await expect(
        resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { ...confirm })
      ).resolves.toEqual({ id: "enc-uuid" });

      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        { encounterId: "enc-uuid" },
        expect.objectContaining({ jobId: "enter-scores-enc-uuid" })
      );
      expect(tx.commit.mock.invocationCallOrder[0]).toBeLessThan(
        syncQueue.add.mock.invocationCallOrder[0]
      );
    });

    it("still requests a push on a later update while a finished result is not synced", async () => {
      jest
        .spyOn(EncounterCompetition, "findByPk")
        .mockResolvedValue(makeDbEncounter({ finished: true, enteredOn: confirm.enteredOn }));
      useTransaction();

      await resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { comments: "late" });

      expect(syncQueue.add).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["the result was already synced", { scoresSyncedAt: new Date() }, { ...confirm }],
      ["the encounter is not finished", {}, { comments: "still playing" }],
      ["the result is not entered", {}, { finished: true }],
    ])("does not request a push when %s", async (_, encounterOverrides, data) => {
      jest
        .spyOn(EncounterCompetition, "findByPk")
        .mockResolvedValue(makeDbEncounter(encounterOverrides));
      useTransaction();

      await resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", data);

      expect(syncQueue.getJob).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("retries a failed push when the result is confirmed again", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
      useTransaction();
      const failed = {
        failedReason: "[SAVE_FAILED] save did not stick",
        getState: jest.fn().mockResolvedValue("failed"),
        retry: jest.fn().mockResolvedValue(undefined),
      };
      syncQueue.getJob.mockResolvedValue(failed);

      await resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { ...confirm });

      expect(failed.retry).toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("does not push and surfaces the commit error when the commit fails", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
      const tx = useTransaction(jest.fn().mockRejectedValue(new Error("connection lost")));

      await expect(
        resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { ...confirm })
      ).rejects.toThrow("connection lost");

      expect(tx.rollback).not.toHaveBeenCalled();
      expect(syncQueue.getJob).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("rolls back and does not push when the update fails", async () => {
      const encounter = makeDbEncounter();
      encounter.update = jest.fn().mockRejectedValue(new Error("DB failure"));
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      const tx = useTransaction();

      await expect(
        resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { ...confirm })
      ).rejects.toThrow("DB failure");

      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("returns the saved result when the queue fails after the commit", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeDbEncounter());
      const tx = useTransaction();
      syncQueue.add.mockRejectedValue(new Error("redis down"));

      await expect(
        resolver.updateEncounterCompetition(resultEnterer, "enc-uuid", { ...confirm })
      ).resolves.toEqual({ id: "enc-uuid" });

      expect(tx.commit).toHaveBeenCalled();
      expect(tx.rollback).not.toHaveBeenCalled();
    });
  });
});
