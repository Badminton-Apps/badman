import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { Club, Player, Team } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { TeamRenumberResolver } from "./team-renumber.resolver";
import { TeamRenumberingService, RenumberedTeam } from "./team-renumbering.service";
import { ErrorCode } from "../../utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const userWithPermission = (allowed: boolean) =>
  ({
    id: "user-uuid",
    hasAnyPermission: jest.fn().mockResolvedValue(allowed),
  }) as unknown as Player;

const stubClub = (id = "club-uuid") =>
  ({ id, name: "Test Club", abbreviation: "TC" }) as unknown as Club;

const makeTeam = (id: string, teamNumber: number): Team =>
  ({
    id,
    teamNumber,
    name: `TC ${teamNumber}H`,
    abbreviation: `TC ${teamNumber}H`,
  }) as unknown as Team;

const makeRenumbered = (teams: Team[]): RenumberedTeam[] =>
  teams.map((team, i) => ({ team, changed: team.teamNumber !== i + 1 }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamRenumberResolver.recalculateTeamNumbersForGroup", () => {
  let resolver: TeamRenumberResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockService: { recalculateForScope: jest.Mock };

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    mockService = {
      recalculateForScope: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamRenumberResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        {
          provide: TeamRenumberingService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<TeamRenumberResolver>(TeamRenumberResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // --------------------------------------------------------------------------
  // Success — query-returns-data
  // --------------------------------------------------------------------------

  it("commits and returns recalculated teams on success (single type)", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const team1 = makeTeam("t1", 1);
    const team2 = makeTeam("t2", 2);

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    mockService.recalculateForScope.mockResolvedValue(makeRenumbered([team1, team2]));

    const result = await resolver.recalculateTeamNumbersForGroup(
      "club-uuid",
      2026,
      SubEventTypeEnum.M,
      false,
      user
    );

    expect(result.teams).toHaveLength(2);
    expect(result.teams[0]).toBe(team1);
    expect(result.teams[1]).toBe(team2);
    expect(result.affectedScope).toEqual({
      clubId: "club-uuid",
      season: 2026,
      types: [SubEventTypeEnum.M],
    });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
  });

  it("commits and returns teams for pooled MX+NATIONAL scope", async () => {
    const user = userWithPermission(true);
    const club = stubClub();
    const national = makeTeam("nat1", 1);
    const mx1 = makeTeam("mx1", 2);
    const mx2 = makeTeam("mx2", 3);

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    mockService.recalculateForScope.mockResolvedValue(makeRenumbered([national, mx1, mx2]));

    const result = await resolver.recalculateTeamNumbersForGroup(
      "club-uuid",
      2026,
      SubEventTypeEnum.MX,
      true, // nationalCountsAsMixed
      user
    );

    expect(result.teams).toHaveLength(3);
    expect(result.affectedScope.types).toEqual([SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX]);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    // Service was called with the pooled types list
    expect(mockService.recalculateForScope).toHaveBeenCalledWith(
      expect.objectContaining({
        types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX],
      })
    );
  });

  it("returns empty teams array when scope has no teams", async () => {
    const user = userWithPermission(true);
    const club = stubClub();

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    mockService.recalculateForScope.mockResolvedValue([]);

    const result = await resolver.recalculateTeamNumbersForGroup(
      "club-uuid",
      2026,
      SubEventTypeEnum.F,
      false,
      user
    );

    expect(result.teams).toHaveLength(0);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Error — mutation-rejects-unauthorized (PERMISSION_DENIED)
  // --------------------------------------------------------------------------

  it("throws PERMISSION_DENIED when user lacks club-edit permission (no write, no transaction)", async () => {
    const user = userWithPermission(false);

    // Authorization is checked BEFORE the transaction is opened
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());
    mockService.recalculateForScope.mockResolvedValue([]);

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "club-uuid",
        2026,
        SubEventTypeEnum.M,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      expect(e.extensions["userId"]).toBe("user-uuid");
      expect(e.extensions["clubId"]).toBe("club-uuid");
    }

    // No commit (auth throws before transaction opens)
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    // Service was never invoked
    expect(mockService.recalculateForScope).not.toHaveBeenCalled();
  });

  it("extensions.code is exactly PERMISSION_DENIED for unauthorized call", async () => {
    const user = userWithPermission(false);

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "some-club",
        2026,
        SubEventTypeEnum.MX,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
    }
  });

  // --------------------------------------------------------------------------
  // Error — mutation-handles-not-found (CLUB_NOT_FOUND)
  // --------------------------------------------------------------------------

  it("throws CLUB_NOT_FOUND and rolls back when clubId does not exist", async () => {
    const user = userWithPermission(true);

    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "missing-club",
        2026,
        SubEventTypeEnum.M,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("CLUB_NOT_FOUND");
      expect(e.extensions["clubId"]).toBe("missing-club");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockService.recalculateForScope).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Error — mutation-rolls-back-on-error
  // --------------------------------------------------------------------------

  it("rolls back and rethrows when service throws an unexpected error", async () => {
    const user = userWithPermission(true);
    const club = stubClub();

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    mockService.recalculateForScope.mockRejectedValue(new Error("DB explosion"));

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "club-uuid",
        2026,
        SubEventTypeEnum.M,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      // Non-classified errors are wrapped as INTERNAL_ERROR
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("wraps INTERNAL_ERROR from service and rolls back", async () => {
    const user = userWithPermission(true);
    const club = stubClub();

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    const serviceError = new Error("unexpected crash");
    mockService.recalculateForScope.mockRejectedValue(serviceError);

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "club-uuid",
        2026,
        SubEventTypeEnum.F,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
      // Must not leak internal error details to the client
      expect(e.message).not.toContain("unexpected crash");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("re-throws a GraphQLError from service without double-wrapping", async () => {
    const user = userWithPermission(true);
    const club = stubClub();

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    const alreadyClassified = new GraphQLError("Primary ranking system not configured.", {
      extensions: { code: "INTERNAL_ERROR" },
    });
    mockService.recalculateForScope.mockRejectedValue(alreadyClassified);

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "club-uuid",
        2026,
        SubEventTypeEnum.M,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
      // The original message should be preserved (not double-wrapped)
      expect(e.message).toBe("Primary ranking system not configured.");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Scope derivation
  // --------------------------------------------------------------------------

  it("passes [type] to service for M type (single-tier)", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());
    mockService.recalculateForScope.mockResolvedValue([]);

    await resolver.recalculateTeamNumbersForGroup("c", 2026, SubEventTypeEnum.M, false, user);

    expect(mockService.recalculateForScope).toHaveBeenCalledWith(
      expect.objectContaining({ types: [SubEventTypeEnum.M] })
    );
  });

  it("passes [NATIONAL] to service for NATIONAL type", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());
    mockService.recalculateForScope.mockResolvedValue([]);

    await resolver.recalculateTeamNumbersForGroup(
      "c",
      2026,
      SubEventTypeEnum.NATIONAL,
      false,
      user
    );

    expect(mockService.recalculateForScope).toHaveBeenCalledWith(
      expect.objectContaining({ types: [SubEventTypeEnum.NATIONAL] })
    );
  });

  it("passes [NATIONAL, MX] to service for MX type with nationalCountsAsMixed=true", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(stubClub());
    mockService.recalculateForScope.mockResolvedValue([]);

    await resolver.recalculateTeamNumbersForGroup("c", 2026, SubEventTypeEnum.MX, true, user);

    expect(mockService.recalculateForScope).toHaveBeenCalledWith(
      expect.objectContaining({ types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX] })
    );
  });

  // --------------------------------------------------------------------------
  // Error — BAD_USER_INPUT for non-UUID clubId
  // --------------------------------------------------------------------------

  it("throws BAD_USER_INPUT and logs warn when clubId is a slug (not a UUID)", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Logger.prototype, "warn");

    // Access the sequelize mock from the module for assertion
    const txSpy = jest.spyOn(resolver["_sequelize"], "transaction");

    try {
      await resolver.recalculateTeamNumbersForGroup(
        "smash-for-fun",
        2026,
        SubEventTypeEnum.M,
        false,
        user
      );
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
      expect(e.extensions["field"]).toBe("clubId");
      expect(e.extensions["value"]).toBe("smash-for-fun");
    }

    // No transaction should be opened (validation fires before everything)
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(txSpy).not.toHaveBeenCalled();

    // Logger.warn should have been called once with the expected payload
    expect(Logger.prototype.warn).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.BAD_USER_INPUT,
        field: "clubId",
        value: "smash-for-fun",
      })
    );
  });

  // --------------------------------------------------------------------------
  // Create-then-recalculate sequence (US2)
  // --------------------------------------------------------------------------

  it("recalculate after createTeam produces correct numbers for new team", async () => {
    const user = userWithPermission(true);
    const club = stubClub();

    // After createTeam, the group has 4 teams; recalculate assigns 1..4 by baseIndex
    const t1 = makeTeam("t1", 1);
    const t2 = makeTeam("t2", 2); // this is the new team that got placeholder number 4, now assigned 2
    const t3 = makeTeam("t3", 3);
    const t4 = makeTeam("t4", 4);

    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    mockService.recalculateForScope.mockResolvedValue([
      { team: t1, changed: false },
      { team: t2, changed: true },
      { team: t3, changed: true },
      { team: t4, changed: true },
    ]);

    const result = await resolver.recalculateTeamNumbersForGroup(
      "club-uuid",
      2026,
      SubEventTypeEnum.M,
      false,
      user
    );

    expect(result.teams).toHaveLength(4);
    expect(result.teams[0]).toBe(t1);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });
});
