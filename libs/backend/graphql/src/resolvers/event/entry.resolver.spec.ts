import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { Club, EventEntry, Logging, Player, Team } from "@badman/backend-database";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { EventEntryResolver } from "./entry.resolver";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { ErrorCode } from "../../utils/error-codes";

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
      id: "club-uuid",
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
      clubId: "club-uuid",
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
      ],
    }).compile();
    resolver = module.get<EventEntryResolver>(EventEntryResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // Case #1: unauthorized user
  it("throws UnauthorizedException when user lacks permission", async () => {
    const user = userWithPermission(false);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());

    await expect(
      resolver.finishEventEntry(user, "club-uuid", 2026, "new@example.com")
    ).rejects.toThrow(UnauthorizedException);

    // No model writes
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case #2: unknown clubId
  it("throws NotFoundException when club does not exist", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    await expect(
      resolver.finishEventEntry(user, "missing-club", 2026, "new@example.com")
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
      await resolver.finishEventEntry(user, "club-uuid", 2026, "new@example.com");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions?.["code"]).toBe(ErrorCode.NO_TEAMS_TO_FINALISE);
      expect(e.extensions?.["clubId"]).toBe("club-uuid");
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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "new@example.com");

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
      "club-uuid",
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
      resolver.finishEventEntry(user, "club-uuid", 2026, "new@example.com")
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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "same@example.com");

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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "new@example.com");

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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "test@example.com");

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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "test@example.com");

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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "test@example.com");

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

    await resolver.finishEventEntry(user, "club-uuid", 2026, "test@example.com");

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

    const result = await resolver.finishEventEntry(user, "club-uuid", 2026, "test@example.com");

    expect(result.success).toBe(true);
    expect(result.alreadyFinalised).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });
});
