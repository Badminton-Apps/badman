import { Test, TestingModule } from "@nestjs/testing";
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
