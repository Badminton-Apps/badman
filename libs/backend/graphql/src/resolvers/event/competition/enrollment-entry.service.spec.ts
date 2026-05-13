import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { EventEntry, Player, SubEventCompetition, Team } from "@badman/backend-database";
import { EnrollmentEntryService } from "./enrollment-entry.service";

describe("EnrollmentEntryService.createEntry", () => {
  let service: EnrollmentEntryService;

  const fakeTransaction = {} as never;

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const userMatchingPerms = (matching: string[]) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest
        .fn()
        .mockImplementation(async (requested: string[]) =>
          requested.some((p) => matching.includes(p))
        ),
    }) as unknown as Player;

  const stubSubEvent = (overrides?: Partial<{ season: number }>) => {
    const addEventEntry = jest.fn().mockResolvedValue(undefined);
    return {
      eventCompetition: { season: overrides?.season ?? 2026 },
      addEventEntry,
      _addEventEntry: addEventEntry,
    } as unknown as SubEventCompetition & {
      addEventEntry: jest.Mock;
      _addEventEntry: jest.Mock;
    };
  };

  const stubEntry = (overrides?: { subEventId?: string; meta?: object }) => {
    const save = jest.fn().mockResolvedValue(undefined);
    const entry = {
      id: "entry-uuid",
      subEventId: overrides?.subEventId ?? null,
      meta: overrides?.meta ?? undefined,
      save,
      _save: save,
    };
    return entry as unknown as EventEntry & { _save: jest.Mock };
  };

  const stubTeam = (overrides?: {
    season?: number;
    clubId?: string;
    existingEntry?: EventEntry | null;
  }) => {
    const existingEntry = overrides?.existingEntry === undefined ? null : overrides.existingEntry;
    const getEntry = jest.fn().mockResolvedValue(existingEntry);
    const setEntry = jest.fn().mockResolvedValue(undefined);
    return {
      id: "team-uuid",
      season: overrides?.season ?? 2026,
      clubId: overrides?.clubId ?? "club-uuid",
      getEntry,
      setEntry,
      _getEntry: getEntry,
      _setEntry: setEntry,
    } as unknown as Team & { _getEntry: jest.Mock; _setEntry: jest.Mock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrollmentEntryService],
    }).compile();
    service = module.get<EnrollmentEntryService>(EnrollmentEntryService);
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws TEAM_NOT_FOUND when the team is missing", async () => {
    jest.spyOn(Team, "findByPk").mockResolvedValue(null);

    const user = userWithPermission(true);
    await expect(
      service.createEntry({
        teamId: "missing",
        subEventId: "se-uuid",
        basePlayers: [],
        transaction: fakeTransaction,
        user,
      })
    ).rejects.toThrow(GraphQLError);

    try {
      await service.createEntry({
        teamId: "missing",
        subEventId: "se-uuid",
        basePlayers: [],
        transaction: fakeTransaction,
        user,
      });
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("TEAM_NOT_FOUND");
      expect(e.extensions["teamId"]).toBe("missing");
    }
  });

  it("throws PERMISSION_DENIED when the user holds none of the accepted permissions", async () => {
    const team = stubTeam();
    const user = userWithPermission(false);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);

    try {
      await service.createEntry({
        teamId: team.id,
        subEventId: "se-uuid",
        basePlayers: [],
        transaction: fakeTransaction,
        user,
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      expect(e.extensions["userId"]).toBe("user-uuid");
    }

    expect(user.hasAnyPermission).toHaveBeenCalledWith([
      "edit:competition",
      `${team.clubId}_edit:club`,
      "edit-any:club",
    ]);
  });

  it("succeeds when the user has only the team's club-scoped edit:club permission", async () => {
    const team = stubTeam({ clubId: "my-club" });
    const user = userMatchingPerms([`my-club_edit:club`]);
    const subEvent = stubSubEvent({ season: 2026 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);
    jest.spyOn(EventEntry, "create").mockResolvedValue({} as unknown as EventEntry);

    const result = await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(result.alreadyExisted).toBe(false);
  });

  it("throws SUB_EVENT_NOT_FOUND when the sub-event is missing", async () => {
    const team = stubTeam();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(null);

    try {
      await service.createEntry({
        teamId: team.id,
        subEventId: "missing-se",
        basePlayers: [],
        transaction: fakeTransaction,
        user,
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("SUB_EVENT_NOT_FOUND");
      expect(e.extensions["subEventId"]).toBe("missing-se");
    }
  });

  it("throws SEASON_MISMATCH with both seasons in extensions when seasons differ", async () => {
    const team = stubTeam({ season: 2026 });
    const subEvent = stubSubEvent({ season: 2025 });
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    try {
      await service.createEntry({
        teamId: team.id,
        subEventId: "se-uuid",
        basePlayers: [],
        transaction: fakeTransaction,
        user,
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("SEASON_MISMATCH");
      expect(e.extensions["teamSeason"]).toBe(2026);
      expect(e.extensions["competitionSeason"]).toBe(2025);
    }
  });

  it("is idempotent when the existing entry already points to the requested sub-event", async () => {
    const existingEntry = stubEntry({ subEventId: "se-uuid" });
    const team = stubTeam({ existingEntry });
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    const result = await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(result.alreadyExisted).toBe(true);
    expect((team as unknown as { _setEntry: jest.Mock })._setEntry).not.toHaveBeenCalled();
    expect(
      (subEvent as unknown as { _addEventEntry: jest.Mock })._addEventEntry
    ).not.toHaveBeenCalled();
  });

  it("creates a fresh entry on a new enrollment", async () => {
    const team = stubTeam();
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);
    jest.spyOn(EventEntry, "create").mockResolvedValue(stubEntry());

    const result = await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(result.alreadyExisted).toBe(false);
    expect(
      (subEvent as unknown as { _addEventEntry: jest.Mock })._addEventEntry
    ).toHaveBeenCalled();
  });

  it("reuses an existing entry when the team already has one pointing to a different sub-event", async () => {
    const existingEntry = stubEntry({ subEventId: "old-se" });
    const team = stubTeam({ existingEntry });
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    const result = await service.createEntry({
      teamId: team.id,
      subEventId: "new-se",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(result.alreadyExisted).toBe(false);
    expect((team as unknown as { _setEntry: jest.Mock })._setEntry).toHaveBeenCalledWith(
      existingEntry,
      expect.any(Object)
    );
  });

  it("writes basePlayers into meta.competition.players on a new entry", async () => {
    const team = stubTeam();
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    const createSpy = jest
      .spyOn(EventEntry, "create")
      .mockResolvedValue(stubEntry());
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: ["p1", "p2"],
      transaction: fakeTransaction,
      user,
    });

    expect(createSpy).toHaveBeenCalledWith(
      { meta: { competition: { players: [{ id: "p1" }, { id: "p2" }] } } },
      expect.any(Object)
    );
  });

  it("creates entry without meta when basePlayers is empty", async () => {
    const team = stubTeam();
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    const createSpy = jest
      .spyOn(EventEntry, "create")
      .mockResolvedValue(stubEntry());
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(createSpy).toHaveBeenCalledWith({}, expect.any(Object));
  });

  it("updates meta.competition.players on an existing entry when basePlayers provided", async () => {
    const existingEntry = stubEntry({ subEventId: "se-uuid" });
    const team = stubTeam({ existingEntry });
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: ["p1", "p2"],
      transaction: fakeTransaction,
      user,
    });

    expect(existingEntry.meta).toMatchObject({
      competition: { players: [{ id: "p1" }, { id: "p2" }] },
    });
    expect(existingEntry._save).toHaveBeenCalled();
  });

  it("does not call entry.save when basePlayers is empty on an existing entry", async () => {
    const existingEntry = stubEntry({ subEventId: "se-uuid" });
    const team = stubTeam({ existingEntry });
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    await service.createEntry({
      teamId: team.id,
      subEventId: "se-uuid",
      basePlayers: [],
      transaction: fakeTransaction,
      user,
    });

    expect(existingEntry._save).not.toHaveBeenCalled();
  });
});
