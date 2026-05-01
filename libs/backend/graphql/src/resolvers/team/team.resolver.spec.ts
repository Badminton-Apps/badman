import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import {
  Club,
  EventEntry,
  Player,
  RankingLastPlace,
  RankingSystem,
  Team,
  TeamNewInput,
  TeamUpdateInput,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { TeamsResolver } from "./team.resolver";

describe("TeamsResolver.createTeam", () => {
  let resolver: TeamsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const stubClub = (id = "club-uuid") =>
    ({ id, name: "Test club", abbreviation: "TC" }) as unknown as Club;

  const baseInput = (overrides: Partial<TeamNewInput> = {}): TeamNewInput =>
    ({
      clubId: "club-uuid",
      season: 2026,
      type: SubEventTypeEnum.MX,
      teamNumber: 1,
      name: "TC 1",
      ...overrides,
    }) as TeamNewInput;

  const stubCreatedTeam = (overrides?: Partial<{ id: string; clubId: string }>) => {
    const setClub = jest.fn().mockResolvedValue(undefined);
    const addPlayer = jest.fn().mockResolvedValue(undefined);
    return {
      id: overrides?.id ?? "new-team-uuid",
      clubId: overrides?.clubId ?? "club-uuid",
      name: "TC 1",
      type: SubEventTypeEnum.MX,
      setClub,
      addPlayer,
      _setClub: setClub,
      _addPlayer: addPlayer,
    } as unknown as Team & { _setClub: jest.Mock; _addPlayer: jest.Mock };
  };

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();
    resolver = module.get<TeamsResolver>(TeamsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns CLUB_NOT_FOUND and rolls back when the club is missing", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    try {
      await resolver.createTeam(baseInput({ clubId: "missing-club" }), false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("CLUB_NOT_FOUND");
      expect(e.extensions["clubId"]).toBe("missing-club");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("returns PERMISSION_DENIED with clubId in extensions when the user lacks permission", async () => {
    const user = userWithPermission(false);
    const dbClub = stubClub();
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);

    try {
      await resolver.createTeam(baseInput(), false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      expect(e.extensions["userId"]).toBe("user-uuid");
      expect(e.extensions["clubId"]).toBe("club-uuid");
    }

    expect(user.hasAnyPermission).toHaveBeenCalledWith([`${dbClub.id}_edit:club`, "edit-any:club"]);
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("returns alreadyExisted: true with no writes when (link, season) already exists (US2 idempotency)", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const existing = {
      id: "existing-team-uuid",
      clubId: dbClub.id,
    } as unknown as Team;

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "findOne").mockResolvedValue(existing);
    const createSpy = jest.spyOn(Team, "create");
    const maxSpy = jest.spyOn(Team, "max");

    const result = await resolver.createTeam(baseInput({ link: "shared-link" }), false, user);

    expect(result).toEqual({
      teamId: "existing-team-uuid",
      clubId: dbClub.id,
      alreadyExisted: true,
    });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    // No writes: no Team.create, no teamNumber computation, no setClub, no entry/roster sync.
    expect(createSpy).not.toHaveBeenCalled();
    expect(maxSpy).not.toHaveBeenCalled();
  });

  it("falls through to fresh-create when link is provided but no row matches", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const created = stubCreatedTeam();

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "findOne").mockResolvedValue(null);
    jest.spyOn(Team, "create").mockResolvedValue(created);

    const result = await resolver.createTeam(baseInput({ link: "no-match-link" }), false, user);

    expect(result.alreadyExisted).toBe(false);
    expect(result.teamId).toBe(created.id);
    expect(created._setClub).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  it("returns a fresh TeamResult on successful create with no link", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const created = stubCreatedTeam();
    const findOneSpy = jest.spyOn(Team, "findOne");

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "create").mockResolvedValue(created);

    const result = await resolver.createTeam(baseInput(), false, user);

    expect(result).toEqual({
      teamId: created.id,
      clubId: dbClub.id,
      alreadyExisted: false,
    });
    expect(findOneSpy).not.toHaveBeenCalled(); // no link → no idempotency lookup
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  it("returns PLAYER_NOT_FOUND when a roster player id does not exist", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const created = stubCreatedTeam();

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "create").mockResolvedValue(created);
    jest.spyOn(Player, "findAll").mockResolvedValue([]); // none of the requested players exist

    const input = baseInput({
      players: [{ id: "missing-player", membershipType: "REGULAR" } as never],
    });

    try {
      await resolver.createTeam(input, false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("PLAYER_NOT_FOUND");
      expect(e.extensions["playerId"]).toBe("missing-player");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("returns RANKING_NOT_FOUND when a base-lineup player has no ranking", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const created = stubCreatedTeam();

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "create").mockResolvedValue(created);
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockResolvedValue([
        { meta: {}, save: jest.fn().mockResolvedValue(undefined) } as never,
        true,
      ]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue({ id: "ranking-system-uuid" } as never);
    jest
      .spyOn(Player, "findAll")
      .mockResolvedValue([{ id: "player-1", gender: "M" } as unknown as Player]);
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]); // no rankings

    const input = baseInput({
      entry: {
        subEventId: "se-uuid",
        meta: {
          competition: {
            teamIndex: -1,
            players: [{ id: "player-1" } as never],
          },
        },
      } as never,
    });

    try {
      await resolver.createTeam(input, false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("RANKING_NOT_FOUND");
      expect(e.extensions["playerId"]).toBe("player-1");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("returns INTERNAL_ERROR (sanitized) on an unexpected throw and does not leak internals", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "create").mockRejectedValue(new Error("boom: internal stuff"));

    try {
      await resolver.createTeam(baseInput(), false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
      expect(e.message).not.toContain("boom: internal stuff");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });
});

describe("TeamsResolver.createTeams", () => {
  let resolver: TeamsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const user = {
    id: "user-uuid",
    hasAnyPermission: jest.fn().mockResolvedValue(true),
  } as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();
    resolver = module.get<TeamsResolver>(TeamsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns one TeamResult per input team", async () => {
    const dbClub = { id: "club-uuid", name: "Test club" } as unknown as Club;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    let counter = 0;
    jest.spyOn(Team, "create").mockImplementation(
      () =>
        ({
          id: `team-${++counter}`,
          clubId: dbClub.id,
          setClub: jest.fn().mockResolvedValue(undefined),
        }) as never
    );

    const inputs: TeamNewInput[] = [
      {
        clubId: dbClub.id,
        season: 2026,
        type: SubEventTypeEnum.MX,
        teamNumber: 1,
        name: "Team A",
      } as TeamNewInput,
      {
        clubId: dbClub.id,
        season: 2026,
        type: SubEventTypeEnum.NATIONAL,
        teamNumber: 1,
        name: "Team B",
      } as TeamNewInput,
    ];

    const results = await resolver.createTeams(inputs, false, user);

    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r).toHaveProperty("teamId");
      expect(r).toHaveProperty("clubId");
      expect(r).toHaveProperty("alreadyExisted", false);
    });
  });
});

describe("TeamsResolver.updateTeam", () => {
  let resolver: TeamsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const stubClub = (id = "club-uuid") =>
    ({ id, name: "Test club", abbreviation: "TC" }) as unknown as Club;

  const stubDbTeam = (overrides: Partial<Team> = {}) => {
    const update = jest.fn().mockResolvedValue(undefined);
    const getPlayers = jest.fn().mockResolvedValue([]);
    const base = {
      id: "team-uuid",
      clubId: "club-uuid",
      teamNumber: 3,
      type: SubEventTypeEnum.M,
      season: 2026,
      name: "Test club 3H",
      abbreviation: "TC 3H",
      club: stubClub(),
      update,
      getPlayers,
      _update: update,
      _getPlayers: getPlayers,
      ...overrides,
    };
    (base as Record<string, unknown>)["toJSON"] = () => ({ ...base });
    return base as unknown as Team & { _update: jest.Mock; _getPlayers: jest.Mock };
  };

  const baseInput = (overrides: Partial<TeamUpdateInput> = {}): TeamUpdateInput =>
    ({
      id: "team-uuid",
      ...overrides,
    }) as TeamUpdateInput;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();
    resolver = module.get<TeamsResolver>(TeamsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws UnauthorizedException when user lacks permission", async () => {
    const user = userWithPermission(false);
    const dbTeam = stubDbTeam();
    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);

    await expect(resolver.updateTeam(baseInput(), user)).rejects.toThrow(UnauthorizedException);

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when team does not exist", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Team, "findByPk").mockResolvedValue(null);

    await expect(resolver.updateTeam(baseInput({ id: "missing" }), user)).rejects.toThrow(
      NotFoundException
    );

    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("throws TEAM_NUMBER_CONFLICT when target number is taken", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 3 });
    const conflicting = { id: "conflict-team-uuid", teamNumber: 5 } as unknown as Team;

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    jest.spyOn(Team, "findOne").mockResolvedValue(conflicting);

    try {
      await resolver.updateTeam(baseInput({ teamNumber: 5 }), user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("TEAM_NUMBER_CONFLICT");
      expect(e.extensions["conflictingTeamId"]).toBe("conflict-team-uuid");
    }

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("commits and returns team when number changes with no conflict", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 3 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    jest.spyOn(Team, "findOne").mockResolvedValue(null); // no conflict
    jest.spyOn(Team, "findAll").mockResolvedValue([]); // no cascade teams
    jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    const result = await resolver.updateTeam(baseInput({ teamNumber: 5 }), user);

    expect(dbTeam._update).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(result).toBe(dbTeam);
  });

  it("does not throw when type changes (US2)", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ type: SubEventTypeEnum.M });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);

    const result = await resolver.updateTeam(baseInput({ type: SubEventTypeEnum.MX }), user);

    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(result).toBe(dbTeam);
  });

  it("succeeds and does not regenerate name when unrelated field changes", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam();
    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    const nameSpy = jest.spyOn(Team, "generateName");

    await resolver.updateTeam(baseInput({ season: 2027 }), user);

    expect(nameSpy).not.toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  it("rolls back transaction on unexpected error", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam();
    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    dbTeam._update.mockRejectedValue(new Error("DB exploded"));

    await expect(resolver.updateTeam(baseInput(), user)).rejects.toThrow("DB exploded");

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("regenerates names for all cascade teams without _temp suffix (US3)", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 1 });

    const makeCascadeTeam = (n: number) => {
      const save = jest.fn().mockResolvedValue(undefined);
      return {
        teamNumber: n,
        type: SubEventTypeEnum.M,
        club: stubClub(),
        name: `Test club ${n}H`,
        abbreviation: `TC ${n}H`,
        save,
        _save: save,
      } as unknown as Team & { _save: jest.Mock };
    };

    const cascadeTeam2 = makeCascadeTeam(2);
    const cascadeTeam3 = makeCascadeTeam(3);

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    jest.spyOn(Team, "findOne").mockResolvedValue(null); // no conflict
    jest.spyOn(Team, "findAll").mockResolvedValue([cascadeTeam2, cascadeTeam3] as Team[]);
    const generateNameSpy = jest.spyOn(Team, "generateName").mockResolvedValue(undefined);
    const generateAbbrevSpy = jest.spyOn(Team, "generateAbbreviation").mockResolvedValue(undefined);

    await resolver.updateTeam(baseInput({ teamNumber: 3 }), user);

    // generateName called for each cascade team in Phase 2
    expect(generateNameSpy).toHaveBeenCalledTimes(2);
    expect(generateAbbrevSpy).toHaveBeenCalledTimes(2);
    // final saves with hooks:false — no _temp in name
    expect(cascadeTeam2._save).toHaveBeenCalledWith(expect.objectContaining({ hooks: false }));
    expect(cascadeTeam3._save).toHaveBeenCalledWith(expect.objectContaining({ hooks: false }));
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });
});
