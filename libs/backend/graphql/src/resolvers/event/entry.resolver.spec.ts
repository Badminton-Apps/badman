import { Test, TestingModule } from "@nestjs/testing";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { Club, EventEntry, Logging, Player, Team } from "@badman/backend-database";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { EventEntryResolver } from "./entry.resolver";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";
import { SubEventCompetitionLoaderService } from "../../loaders";
import { ErrorCode } from "../../utils/error-codes";

const CLUB_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

// Type helper to cast mocked model objects
const asUnknown = <T>(x: unknown): T => x as T;

describe("EventEntryResolver.finishEventEntry", () => {
  let resolver: EventEntryResolver;
  let mockTransaction: {
    commit: jest.Mock;
    rollback: jest.Mock;
    LOCK: { UPDATE: string };
  };
  let mockNotificationService: { notifyEnrollment: jest.Mock };
  let mockEnrollmentService: { fetchAndValidate: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const stubClub = (overrides: Partial<{ contactCompetition: string }> = {}) => {
    const save = jest.fn().mockResolvedValue(undefined);
    return asUnknown<Club & { _save: jest.Mock }>({
      id: CLUB_UUID,
      name: "Test Club",
      contactCompetition: overrides.contactCompetition ?? "existing@example.com",
      save,
      _save: save,
    });
  };

  const stubEntry = (sendOn: Date | null = null, teamId = "team-uuid") => {
    const save = jest.fn().mockResolvedValue(undefined);
    return asUnknown<EventEntry & { _save: jest.Mock }>({
      teamId,
      sendOn,
      save,
      _save: save,
    });
  };

  const stubTeam = (
    entry: (EventEntry & { _save: jest.Mock }) | null = stubEntry(),
    id = "team-uuid"
  ) =>
    asUnknown<Team>({
      id,
      clubId: CLUB_UUID,
      season: 2026,
      entry,
    });

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      LOCK: { UPDATE: "UPDATE" },
    };
    mockNotificationService = { notifyEnrollment: jest.fn().mockResolvedValue(undefined) };
    mockEnrollmentService = { fetchAndValidate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEntryResolver,
        EnrollmentFinalizeService,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: EnrollmentValidationService,
          useValue: mockEnrollmentService,
        },
        {
          provide: EnrollmentValidationCacheService,
          useValue: { getForTeam: jest.fn() },
        },
        {
          provide: SubEventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();
    resolver = module.get<EventEntryResolver>(EventEntryResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // Case #0: BAD_USER_INPUT — UUID validation (T016)
  it("throws BAD_USER_INPUT and logs warn when clubId is not a UUID", async () => {
    const user = userWithPermission(true);
    const txSpy = jest.spyOn(resolver["_sequelize"], "transaction");
    const warnSpy = jest.spyOn(Logger.prototype, "warn");

    try {
      await resolver.finishEventEntry(user, "smash-for-fun", 2026, "test@example.com");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
      expect(e.extensions["field"]).toBe("clubId");
      expect(e.extensions["value"]).toBe("smash-for-fun");
    }

    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(txSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.BAD_USER_INPUT,
        field: "clubId",
        value: "smash-for-fun",
      })
    );
  });

  // Case #1: unauthorized user
  it("throws UnauthorizedException when user lacks permission", async () => {
    const user = userWithPermission(false);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());

    await expect(
      resolver.finishEventEntry(user, CLUB_UUID, 2026, "new@example.com")
    ).rejects.toThrow(UnauthorizedException);

    // No model writes
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case #2: unknown clubId
  it("throws NotFoundException when club does not exist (UUID not in DB)", async () => {
    const user = userWithPermission(true);
    const missingUUID = "00000000-0000-0000-0000-000000000000";
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    await expect(
      resolver.finishEventEntry(user, missingUUID, 2026, "new@example.com")
    ).rejects.toThrow(NotFoundException);

    // No transaction started
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case #3: zero teams
  it("throws GraphQLError with NO_TEAMS_TO_FINALISE and rolls back when no teams for season", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());
    jest.spyOn(Team, "findAll").mockResolvedValue([]);

    try {
      await resolver.finishEventEntry(user, CLUB_UUID, 2026, "new@example.com");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions?.["code"]).toBe(ErrorCode.NO_TEAMS_TO_FINALISE);
      expect(e.extensions?.["clubId"]).toBe(CLUB_UUID);
      expect(e.extensions?.["season"]).toBe(2026);
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case #4: fresh happy path
  it("sets sendOn on all entries, creates log, commits, notifies on fresh finalisation", async () => {
    const user = userWithPermission(true);
    const club = stubClub({ contactCompetition: "old@example.com" });
    const entry1 = stubEntry(null, "team-1");
    const entry2 = stubEntry(null, "team-2");
    const entry3 = stubEntry(null, "team-3");
    const teams = [
      stubTeam(entry1, "team-1"),
      stubTeam(entry2, "team-2"),
      stubTeam(entry3, "team-3"),
    ];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([entry1, entry2, entry3] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "new@example.com");

    expect(result).toEqual({
      success: true,
      alreadyFinalised: false,
      notificationDispatched: true,
    });
    expect(entry1._save).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: mockTransaction })
    );
    expect(entry2._save).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: mockTransaction })
    );
    expect(entry3._save).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: mockTransaction })
    );
    expect(loggingCreate).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.notifyEnrollment).toHaveBeenCalledWith(
      user.id,
      CLUB_UUID,
      2026,
      "new@example.com"
    );
  });

  // Case #5: rollback on Logging.create throw
  it("rolls back and re-throws when Logging.create throws", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const entry1 = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry1, "team-uuid")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry1] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockRejectedValue(new Error("DB write failed"));

    await expect(
      resolver.finishEventEntry(user, CLUB_UUID, 2026, "new@example.com")
    ).rejects.toThrow("DB write failed");

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case #6: already-finalised same email
  it("returns alreadyFinalised: true with no writes when all entries already have sendOn and email matches", async () => {
    const user = userWithPermission(true);
    const club = stubClub({ contactCompetition: "same@example.com" });
    const entry1 = stubEntry(new Date("2026-01-01"), "team-1");
    const entry2 = stubEntry(new Date("2026-01-01"), "team-2");
    const teams = [stubTeam(entry1, "team-1"), stubTeam(entry2, "team-2")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([entry1, entry2] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create");

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "same@example.com");

    expect(result).toEqual({
      success: true,
      alreadyFinalised: true,
      notificationDispatched: false,
    });
    expect(club._save).not.toHaveBeenCalled();
    expect(entry1._save).not.toHaveBeenCalled();
    expect(entry2._save).not.toHaveBeenCalled();
    expect(loggingCreate).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  // Case #7: already-finalised + email differs
  it("updates club.contactCompetition only when already-finalised but email differs", async () => {
    const user = userWithPermission(true);
    const club = stubClub({ contactCompetition: "old@example.com" });
    const entry1 = stubEntry(new Date("2026-01-01"), "team-1");
    const entry2 = stubEntry(new Date("2026-01-01"), "team-2");
    const teams = [stubTeam(entry1, "team-1"), stubTeam(entry2, "team-2")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([entry1, entry2] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create");

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "new@example.com");

    expect(result).toEqual({
      success: true,
      alreadyFinalised: true,
      notificationDispatched: false,
    });
    expect(club._save).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: mockTransaction })
    );
    expect(entry1._save).not.toHaveBeenCalled();
    expect(entry2._save).not.toHaveBeenCalled();
    expect(loggingCreate).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  // Case #8: partial state (some entries null)
  it("updates only null entries and notifies once on partial state", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const entryAlreadySet = stubEntry(new Date("2026-01-01"), "team-set");
    const entryNull = stubEntry(null, "team-null");
    const teamWithSet = stubTeam(entryAlreadySet, "team-set");
    const teamWithNull = stubTeam(entryNull, "team-null");

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue([teamWithSet, teamWithNull]);
    // Locked read returns both entries — one has sendOn set, one doesn't → NOT alreadyFinalised
    jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([entryAlreadySet, entryNull] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "test@example.com");

    expect(result).toEqual({
      success: true,
      alreadyFinalised: false,
      notificationDispatched: true,
    });
    // Only the null entry was saved
    expect(entryAlreadySet._save).not.toHaveBeenCalled();
    expect(entryNull._save).toHaveBeenCalledTimes(1);
    expect(loggingCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.notifyEnrollment).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  // Case #9: team without entry row skipped without error
  it("skips teams without entry row without throwing", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const teamNoEntry = stubTeam(null, "team-no-entry");
    const entryWithData = stubEntry(null, "team-with-entry");
    const teamWithEntry = stubTeam(entryWithData, "team-with-entry");

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue([teamNoEntry, teamWithEntry]);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entryWithData] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "test@example.com");

    expect(result.success).toBe(true);
    expect(result.alreadyFinalised).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  // Case #10: notification fails post-commit
  it("commits DB writes but returns notificationDispatched: false when notification rejects", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const entry1 = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry1, "team-uuid")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry1] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);
    mockNotificationService.notifyEnrollment.mockRejectedValue(new Error("SMTP failure"));

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "test@example.com");

    // DB writes committed
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    // Resolver did NOT throw
    expect(result).toEqual({
      success: true,
      alreadyFinalised: false,
      notificationDispatched: false,
    });
  });

  // Case #11: row-lock query uses LOCK.UPDATE
  it("passes lock: transaction.LOCK.UPDATE to EventEntry.findAll", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const entry1 = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry1, "team-uuid")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    const eventEntryFindAll = jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([entry1] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    await resolver.finishEventEntry(user, CLUB_UUID, 2026, "test@example.com");

    expect(eventEntryFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: mockTransaction.LOCK.UPDATE,
        transaction: mockTransaction,
      })
    );
  });

  // Case #12: edit-any:club permission grants access
  it("allows caller with edit-any:club permission", async () => {
    const user = asUnknown<Player>({
      id: "admin-uuid",
      hasAnyPermission: jest
        .fn()
        .mockImplementation(async (perms: string[]) => perms.includes("edit-any:club")),
    });
    const club = stubClub();
    const entry1 = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry1, "team-uuid")];

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry1] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await resolver.finishEventEntry(user, CLUB_UUID, 2026, "test@example.com");

    expect(result.success).toBe(true);
    expect(result.alreadyFinalised).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// EventEntryResolver.enrollmentValidation gate (FR-001, FR-002, FR-006, FR-010)
// T004, T005, T006, T010, T011, T012
// ---------------------------------------------------------------------------
describe("EventEntryResolver.enrollmentValidation (gate)", () => {
  let resolver: EventEntryResolver;
  let mockCacheService: { getForTeam: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const stubTeamModel = (id = "team-uuid", clubId = CLUB_UUID, season = 2026) =>
    asUnknown<Team>({ id, clubId, season });

  const stubEventEntry = (teamGetter: () => Promise<Team>) =>
    asUnknown<EventEntry>({ getTeam: teamGetter });

  const buildModule = async (enrollmentValidationDefaultEnabled: boolean) => {
    mockCacheService = { getForTeam: jest.fn() };
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "ENROLLMENT_VALIDATION_DEFAULT_ENABLED")
          return enrollmentValidationDefaultEnabled;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEntryResolver,
        EnrollmentFinalizeService,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue({
              commit: jest.fn(),
              rollback: jest.fn(),
              LOCK: { UPDATE: "UPDATE" },
            }),
          },
        },
        {
          provide: NotificationService,
          useValue: { notifyEnrollment: jest.fn() },
        },
        {
          provide: EnrollmentValidationService,
          useValue: { fetchAndValidate: jest.fn() },
        },
        {
          provide: EnrollmentValidationCacheService,
          useValue: mockCacheService,
        },
        {
          provide: SubEventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    return module.get<EventEntryResolver>(EventEntryResolver);
  };

  afterEach(() => jest.restoreAllMocks());

  // T004 — validate omitted (undefined) + env flag false → null, no cache call
  it("returns null and does not call getForTeam when validate is undefined and env flag is false", async () => {
    resolver = await buildModule(false);
    const team = stubTeamModel();
    const entry = stubEventEntry(() => Promise.resolve(team));

    const result = await resolver.enrollmentValidation(entry, undefined);

    expect(result).toBeNull();
    expect(mockCacheService.getForTeam).not.toHaveBeenCalled();
  });

  // T005 — validate explicitly false + env flag false → null, no cache call
  it("returns null and does not call getForTeam when validate is false and env flag is false", async () => {
    resolver = await buildModule(false);
    const team = stubTeamModel();
    const entry = stubEventEntry(() => Promise.resolve(team));

    const result = await resolver.enrollmentValidation(entry, false);

    expect(result).toBeNull();
    expect(mockCacheService.getForTeam).not.toHaveBeenCalled();
  });

  // T006 — when computation is skipped, getTeam must NOT be called (no unnecessary association fetch)
  it("does not call eventEntry.getTeam() when computation is skipped", async () => {
    resolver = await buildModule(false);
    const getTeamMock = jest.fn().mockResolvedValue(stubTeamModel());
    const entry = asUnknown<EventEntry>({ getTeam: getTeamMock });

    await resolver.enrollmentValidation(entry, undefined);

    expect(getTeamMock).not.toHaveBeenCalled();
  });

  // T010 — validate: true → delegates to cache and returns result verbatim
  it("calls getTeam() once and getForTeam(team) once, returning the cache value when validate is true", async () => {
    resolver = await buildModule(false);
    const team = stubTeamModel();
    const getTeamMock = jest.fn().mockResolvedValue(team);
    const entry = asUnknown<EventEntry>({ getTeam: getTeamMock });
    const fakeOutput = { teams: [] } as unknown as ReturnType<typeof mockCacheService.getForTeam>;
    mockCacheService.getForTeam.mockResolvedValue(fakeOutput);

    const result = await resolver.enrollmentValidation(entry, true);

    expect(getTeamMock).toHaveBeenCalledTimes(1);
    expect(mockCacheService.getForTeam).toHaveBeenCalledWith(team);
    expect(result).toBe(fakeOutput);
  });

  // T011 — validate omitted + env flag true (kill-switch) → delegates to cache
  it("delegates to cache when validate is omitted AND ENROLLMENT_VALIDATION_DEFAULT_ENABLED is true", async () => {
    resolver = await buildModule(true);
    const team = stubTeamModel();
    const getTeamMock = jest.fn().mockResolvedValue(team);
    const entry = asUnknown<EventEntry>({ getTeam: getTeamMock });
    const fakeOutput = { teams: [] } as unknown as ReturnType<typeof mockCacheService.getForTeam>;
    mockCacheService.getForTeam.mockResolvedValue(fakeOutput);

    const result = await resolver.enrollmentValidation(entry, undefined);

    expect(getTeamMock).toHaveBeenCalledTimes(1);
    expect(mockCacheService.getForTeam).toHaveBeenCalledWith(team);
    expect(result).toBe(fakeOutput);
  });

  // T012 — validate: true but cache rejects → rejection surfaces (spec FR-006)
  it("propagates cache rejection when validate is true (does NOT swallow to null)", async () => {
    resolver = await buildModule(false);
    const team = stubTeamModel();
    const entry = stubEventEntry(() => Promise.resolve(team));
    mockCacheService.getForTeam.mockRejectedValue(new Error("DB down"));

    await expect(resolver.enrollmentValidation(entry, true)).rejects.toThrow("DB down");
  });

  // Edge case: explicit validate: false with kill-switch true → MUST still return null
  it("returns null when validate is explicitly false even if ENROLLMENT_VALIDATION_DEFAULT_ENABLED is true", async () => {
    resolver = await buildModule(true);
    const getTeamMock = jest.fn();
    const entry = asUnknown<EventEntry>({ getTeam: getTeamMock });

    const result = await resolver.enrollmentValidation(entry, false);

    expect(result).toBeNull();
    expect(getTeamMock).not.toHaveBeenCalled();
    expect(mockCacheService.getForTeam).not.toHaveBeenCalled();
  });
});
