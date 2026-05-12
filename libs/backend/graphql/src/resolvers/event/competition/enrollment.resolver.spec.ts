import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { EventEntry, Player, SubEventCompetition, Team } from "@badman/backend-database";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { EnrollmentEntryService } from "./enrollment-entry.service";
import { EnrollmentResolver } from "./enrollment.resolver";

describe("EnrollmentResolver.createEnrollment", () => {
  let resolver: EnrollmentResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  // user.hasAnyPermission decides per requested permission string
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

  const stubTeam = (overrides?: {
    season?: number;
    clubId?: string;
    existingEntry?: { subEventId: string | null } | null;
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
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentResolver,
        EnrollmentEntryService,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        {
          provide: EnrollmentValidationService,
          useValue: { fetchAndValidate: jest.fn() },
        },
      ],
    }).compile();
    resolver = module.get<EnrollmentResolver>(EnrollmentResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns TEAM_NOT_FOUND and rolls back when the team is missing", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(null);

    await expect(resolver.createEnrollment(user, "missing-team", "se-uuid")).rejects.toThrow(
      GraphQLError
    );

    try {
      await resolver.createEnrollment(user, "missing-team", "se-uuid");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("TEAM_NOT_FOUND");
      expect(e.extensions["teamId"]).toBe("missing-team");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("returns PERMISSION_DENIED when the user holds none of the accepted permissions", async () => {
    const user = userWithPermission(false);
    const team = stubTeam();
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);

    try {
      await resolver.createEnrollment(user, team.id, "se-uuid");
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
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("succeeds when the user has only the team's club-scoped edit:club permission (Q1 clarification)", async () => {
    const team = stubTeam({ clubId: "my-club" });
    const user = userMatchingPerms([`my-club_edit:club`]);
    const subEvent = stubSubEvent({ season: 2026 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);
    jest.spyOn(EventEntry, "create").mockResolvedValue({} as unknown as EventEntry);

    const result = await resolver.createEnrollment(user, team.id, "se-uuid");

    expect(result.alreadyExisted).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
  });

  it("returns SUB_EVENT_NOT_FOUND and rolls back when the sub-event is missing", async () => {
    const team = stubTeam();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(null);

    try {
      await resolver.createEnrollment(user, team.id, "missing-se");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("SUB_EVENT_NOT_FOUND");
      expect(e.extensions["subEventId"]).toBe("missing-se");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("returns SEASON_MISMATCH with both seasons in extensions when team and competition seasons differ", async () => {
    const team = stubTeam({ season: 2026 });
    const subEvent = stubSubEvent({ season: 2025 });
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    try {
      await resolver.createEnrollment(user, team.id, "se-uuid");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("SEASON_MISMATCH");
      expect(e.extensions["teamSeason"]).toBe(2026);
      expect(e.extensions["competitionSeason"]).toBe(2025);
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("returns INTERNAL_ERROR (sanitized) on an unexpected throw and logs at error severity", async () => {
    const team = stubTeam();
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);
    (team as unknown as { _getEntry: jest.Mock })._getEntry.mockRejectedValue(
      new Error("boom: internal stuff")
    );

    try {
      await resolver.createEnrollment(user, team.id, "se-uuid");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
      // Internal message must NOT leak.
      expect(e.message).not.toContain("boom: internal stuff");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("is idempotent when the team's existing entry already points to the requested sub-event (US2)", async () => {
    const team = stubTeam({ existingEntry: { subEventId: "se-uuid" } });
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);

    const result = await resolver.createEnrollment(user, team.id, "se-uuid");

    expect(result).toEqual({
      teamId: team.id,
      subEventCompetitionId: "se-uuid",
      alreadyExisted: true,
    });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    // No further writes happen on the idempotent path.
    expect((team as unknown as { _setEntry: jest.Mock })._setEntry).not.toHaveBeenCalled();
    expect(
      (subEvent as unknown as { _addEventEntry: jest.Mock })._addEventEntry
    ).not.toHaveBeenCalled();
  });

  it("returns a fresh EnrollmentResult on a successful new enrollment (US3)", async () => {
    const team = stubTeam();
    const subEvent = stubSubEvent();
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(team);
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(subEvent);
    jest.spyOn(EventEntry, "create").mockResolvedValue({} as unknown as EventEntry);

    const result = await resolver.createEnrollment(user, team.id, "se-uuid");

    expect(result).toEqual({
      teamId: team.id,
      subEventCompetitionId: "se-uuid",
      alreadyExisted: false,
    });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(
      (subEvent as unknown as { _addEventEntry: jest.Mock })._addEventEntry
    ).toHaveBeenCalled();
  });
});
