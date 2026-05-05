import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { Club, EventEntry, Logging, Player, Team } from "@badman/backend-database";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { ErrorCode } from "../../utils/error-codes";

const asUnknown = <T>(x: unknown): T => x as T;

describe("EnrollmentFinalizeService.finalize", () => {
  let service: EnrollmentFinalizeService;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
    LOCK: { UPDATE: "UPDATE" },
  } as never;

  const fakeUser = (id = "user-uuid") =>
    asUnknown<Player>({ id, hasAnyPermission: jest.fn().mockResolvedValue(true) });

  const stubClub = (contactCompetition = "existing@example.com") => {
    const save = jest.fn().mockResolvedValue(undefined);
    return asUnknown<Club & { _save: jest.Mock }>({
      id: "club-uuid",
      contactCompetition,
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

  const stubTeam = (entry: EventEntry | null = stubEntry(), id = "team-uuid") =>
    asUnknown<Team>({ id, clubId: "club-uuid", season: 2026, entry });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrollmentFinalizeService],
    }).compile();
    service = module.get<EnrollmentFinalizeService>(EnrollmentFinalizeService);
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws NO_TEAMS_TO_FINALISE when no teams found for season", async () => {
    jest.spyOn(Team, "findAll").mockResolvedValue([]);
    const club = stubClub();

    try {
      await service.finalize({ clubId: "club-uuid", season: 2026, email: "e@e.com", user: fakeUser(), club, transaction: mockTransaction });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions?.["code"]).toBe(ErrorCode.NO_TEAMS_TO_FINALISE);
      expect(e.extensions?.["clubId"]).toBe("club-uuid");
      expect(e.extensions?.["season"]).toBe(2026);
    }
  });

  it("stamps sendOn on all entries, writes Logging, returns alreadyFinalised: false on fresh path", async () => {
    const entry1 = stubEntry(null, "team-1");
    const entry2 = stubEntry(null, "team-2");
    const teams = [stubTeam(entry1, "team-1"), stubTeam(entry2, "team-2")];
    const club = stubClub("old@example.com");

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry1, entry2] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await service.finalize({ clubId: "club-uuid", season: 2026, email: "new@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(result).toEqual({ alreadyFinalised: false });
    expect(entry1._save).toHaveBeenCalledTimes(1);
    expect(entry2._save).toHaveBeenCalledTimes(1);
    expect(loggingCreate).toHaveBeenCalledTimes(1);
    expect(club._save).toHaveBeenCalledWith(expect.objectContaining({ transaction: mockTransaction }));
  });

  it("returns alreadyFinalised: true and skips stamping + logging when all entries already have sendOn (same email)", async () => {
    const entry1 = stubEntry(new Date("2026-01-01"), "team-1");
    const entry2 = stubEntry(new Date("2026-01-01"), "team-2");
    const teams = [stubTeam(entry1, "team-1"), stubTeam(entry2, "team-2")];
    const club = stubClub("same@example.com");

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry1, entry2] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create");

    const result = await service.finalize({ clubId: "club-uuid", season: 2026, email: "same@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(result).toEqual({ alreadyFinalised: true });
    expect(entry1._save).not.toHaveBeenCalled();
    expect(entry2._save).not.toHaveBeenCalled();
    expect(loggingCreate).not.toHaveBeenCalled();
    expect(club._save).not.toHaveBeenCalled();
  });

  it("updates Club.contactCompetition only when email differs (alreadyFinalised path)", async () => {
    const entry = stubEntry(new Date("2026-01-01"), "team-1");
    const teams = [stubTeam(entry, "team-1")];
    const club = stubClub("old@example.com");

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create");

    const result = await service.finalize({ clubId: "club-uuid", season: 2026, email: "new@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(result).toEqual({ alreadyFinalised: true });
    expect(club._save).toHaveBeenCalledWith(expect.objectContaining({ transaction: mockTransaction }));
  });

  it("stamps only null entries on partial state (some already have sendOn)", async () => {
    const entrySet = stubEntry(new Date("2026-01-01"), "team-set");
    const entryNull = stubEntry(null, "team-null");
    const teams = [stubTeam(entrySet, "team-set"), stubTeam(entryNull, "team-null")];
    const club = stubClub();

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entrySet, entryNull] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await service.finalize({ clubId: "club-uuid", season: 2026, email: "test@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(result).toEqual({ alreadyFinalised: false });
    expect(entrySet._save).not.toHaveBeenCalled();
    expect(entryNull._save).toHaveBeenCalledTimes(1);
  });

  it("skips teams without entry row without throwing", async () => {
    const teamNoEntry = stubTeam(null, "team-no-entry");
    const entryWithData = stubEntry(null, "team-with-entry");
    const teamWithEntry = stubTeam(entryWithData, "team-with-entry");
    const club = stubClub();

    jest.spyOn(Team, "findAll").mockResolvedValue([teamNoEntry, teamWithEntry]);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entryWithData] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    const result = await service.finalize({ clubId: "club-uuid", season: 2026, email: "test@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(result).toEqual({ alreadyFinalised: false });
  });

  it("passes LOCK.UPDATE to EventEntry.findAll", async () => {
    const entry = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry)];
    const club = stubClub();

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    const eventEntryFindAll = jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry] as unknown as EventEntry[]);
    jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    await service.finalize({ clubId: "club-uuid", season: 2026, email: "test@example.com", user: fakeUser(), club, transaction: mockTransaction });

    expect(eventEntryFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ lock: "UPDATE", transaction: mockTransaction })
    );
  });

  it("writes Logging with EnrollmentSubmitted action and correct meta", async () => {
    const entry = stubEntry(null, "team-uuid");
    const teams = [stubTeam(entry)];
    const club = stubClub();
    const user = fakeUser("my-user-id");

    jest.spyOn(Team, "findAll").mockResolvedValue(teams);
    jest.spyOn(EventEntry, "findAll").mockResolvedValue([entry] as unknown as EventEntry[]);
    const loggingCreate = jest.spyOn(Logging, "create").mockResolvedValue(undefined as never);

    await service.finalize({ clubId: "club-uuid", season: 2026, email: "test@example.com", user, club, transaction: mockTransaction });

    expect(loggingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "my-user-id",
        meta: expect.objectContaining({ clubId: "club-uuid", season: 2026, email: "test@example.com" }),
      }),
      expect.objectContaining({ transaction: mockTransaction })
    );
  });
});
