import { Test, TestingModule } from "@nestjs/testing";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import {
  Club,
  EventEntry,
  Player,
  Team,
  TeamNewInput,
  TeamUpdateInput,
} from "@badman/backend-database";
import { IndexCalculationInput, IndexCalculationService } from "@badman/backend-enrollment";
import { TeamAssociationService } from "./team-association.service";

const teamAssociationServiceStub = (): Partial<TeamAssociationService> => ({
  getCaptain: jest.fn().mockResolvedValue(null),
  getClub: jest.fn().mockResolvedValue(null),
  getPrefferedLocation: jest.fn().mockResolvedValue(null),
  getEntry: jest.fn().mockResolvedValue(null),
  getPlayers: jest.fn().mockResolvedValue([]),
});
import { SubEventTypeEnum } from "@badman/utils";
import { ErrorCode } from "../../utils";
import { TeamsResolver } from "./team.resolver";

const CLUB_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const MISSING_UUID = "00000000-0000-0000-0000-000000000000";

describe("TeamsResolver.createTeam", () => {
  let resolver: TeamsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const stubClub = (id = CLUB_UUID) =>
    ({ id, name: "Test club", abbreviation: "TC" }) as unknown as Club;

  const baseInput = (overrides: Partial<TeamNewInput> = {}): TeamNewInput =>
    ({
      clubId: CLUB_UUID,
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
      clubId: overrides?.clubId ?? CLUB_UUID,
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
        {
          provide: IndexCalculationService,
          useValue: {
            calculate: jest.fn().mockResolvedValue([]),
            calculateOne: jest.fn().mockResolvedValue({
              _tag: "success",
              key: "team-key",
              index: 0,
              contributingPlayers: [],
              missingPlayerCount: 0,
              resolvedPlayers: [],
            }),
          },
        },
        {
          provide: TeamAssociationService,
          useValue: teamAssociationServiceStub(),
        },
      ],
    }).compile();
    resolver = module.get<TeamsResolver>(TeamsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws BAD_USER_INPUT and logs warn when clubId is not a UUID", async () => {
    const user = userWithPermission(true);
    const txSpy = jest.spyOn(resolver["_sequelize"], "transaction");
    const warnSpy = jest.spyOn(Logger.prototype, "warn");

    try {
      await resolver.createTeam(baseInput({ clubId: "smash-for-fun" }), false, user);
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
      expect.objectContaining({ code: ErrorCode.BAD_USER_INPUT, field: "clubId" })
    );
  });


  it("returns CLUB_NOT_FOUND and rolls back when the club is missing (UUID not in DB)", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    try {
      await resolver.createTeam(baseInput({ clubId: MISSING_UUID }), false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("CLUB_NOT_FOUND");
      expect(e.extensions["clubId"]).toBe(MISSING_UUID);
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
      expect(e.extensions["clubId"]).toBe(CLUB_UUID);
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

  it("propagates PLAYER_NOT_FOUND from IndexCalculationService", async () => {
    const user = userWithPermission(true);
    const dbClub = stubClub();
    const created = stubCreatedTeam();

    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "create").mockResolvedValue(created);
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockResolvedValue([
        { id: "entry-uuid", meta: {}, save: jest.fn().mockResolvedValue(undefined) } as never,
        true,
      ]);
    jest
      .spyOn(Player, "findAll")
      .mockResolvedValue([{ id: "player-1", gender: "M" } as unknown as Player]);

    // Override the service mock for this test: simulate PLAYER_NOT_FOUND.
    // The resolver should map this to ErrorCode.PLAYER_NOT_FOUND and roll back.
    const calculateMock = (
      resolver as unknown as {
        indexCalculationService: { calculate: jest.Mock };
      }
    ).indexCalculationService.calculate;
    calculateMock.mockResolvedValueOnce([
      {
        _tag: "failure",
        key: "entry-uuid",
        error: {
          code: "PLAYER_NOT_FOUND",
          message: "Players not found: player-1",
          playerIds: ["player-1"],
        },
      },
    ]);

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
      expect(e.extensions["code"]).toBe("PLAYER_NOT_FOUND");
      expect(e.extensions["playerIds"]).toContain("player-1");
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
        {
          provide: IndexCalculationService,
          useValue: {
            calculate: jest.fn().mockResolvedValue([]),
            calculateOne: jest.fn().mockResolvedValue({
              _tag: "success",
              key: "team-key",
              index: 0,
              contributingPlayers: [],
              missingPlayerCount: 0,
              resolvedPlayers: [],
            }),
          },
        },
        {
          provide: TeamAssociationService,
          useValue: teamAssociationServiceStub(),
        },
      ],
    }).compile();
    resolver = module.get<TeamsResolver>(TeamsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws BAD_USER_INPUT and logs warn when any team's clubId is not a UUID", async () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn");

    const inputs: TeamNewInput[] = [
      {
        clubId: "smash-for-fun",
        season: 2026,
        type: SubEventTypeEnum.MX,
        teamNumber: 1,
        name: "Team A",
      } as TeamNewInput,
    ];

    try {
      await resolver.createTeams(inputs, false, user);
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
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ code: ErrorCode.BAD_USER_INPUT, field: "clubId" })
    );
  });

  it("returns one TeamResult per input team", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
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

  // T011: calculate() called once with all inputs when multiple teams have entries
  it("T011: calls calculate() exactly once with all team inputs when teams have player metadata", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    let counter = 0;
    jest
      .spyOn(Team, "create")
      .mockImplementation(
        () =>
          ({
            id: `team-${++counter}`,
            clubId: dbClub.id,
            type: SubEventTypeEnum.MX,
            setClub: jest.fn(),
            addPlayer: jest.fn(),
          }) as never
      );
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockImplementation(() =>
        Promise.resolve([{ id: `entry-${counter}`, meta: {}, save: jest.fn() } as never, true])
      );
    const calculateSpy = jest
      .spyOn(
        (resolver as unknown as { indexCalculationService: { calculate: jest.Mock } })
          .indexCalculationService,
        "calculate"
      )
      .mockResolvedValue([
        {
          _tag: "success",
          key: "entry-1",
          index: 10,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
        {
          _tag: "success",
          key: "entry-2",
          index: 20,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
        {
          _tag: "success",
          key: "entry-3",
          index: 30,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
      ] as never);

    const makeTeam = (n: number): TeamNewInput =>
      ({
        clubId: CLUB_UUID,
        season: 2026,
        type: SubEventTypeEnum.MX,
        teamNumber: n,
        name: `Team ${n}`,
        entry: {
          subEventId: `se-${n}`,
          meta: { competition: { teamIndex: -1, players: [{ id: `p-${n}` }] } },
        },
      }) as never;

    await resolver.createTeams([makeTeam(1), makeTeam(2), makeTeam(3)], false, user);

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    const [inputs] = calculateSpy.mock.calls[0] as [IndexCalculationInput[]];
    expect(inputs).toHaveLength(3);
  });

  // T012: teams without player metadata excluded from batch
  it("T012: excludes teams without entry player metadata from the batch input", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    let counter = 0;
    jest
      .spyOn(Team, "create")
      .mockImplementation(
        () =>
          ({
            id: `team-${++counter}`,
            clubId: dbClub.id,
            type: SubEventTypeEnum.MX,
            setClub: jest.fn(),
            addPlayer: jest.fn(),
          }) as never
      );
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockResolvedValue([{ id: "entry-1", meta: {}, save: jest.fn() } as never, true]);
    const calculateSpy = jest
      .spyOn(
        (resolver as unknown as { indexCalculationService: { calculate: jest.Mock } })
          .indexCalculationService,
        "calculate"
      )
      .mockResolvedValue([
        {
          _tag: "success",
          key: "entry-1",
          index: 10,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
      ] as never);

    const withPlayers: TeamNewInput = {
      clubId: CLUB_UUID,
      season: 2026,
      type: SubEventTypeEnum.MX,
      teamNumber: 1,
      name: "Team A",
      entry: {
        subEventId: "se-1",
        meta: { competition: { teamIndex: -1, players: [{ id: "p-1" }] } },
      },
    } as never;
    const withoutPlayers: TeamNewInput = {
      clubId: CLUB_UUID,
      season: 2026,
      type: SubEventTypeEnum.MX,
      teamNumber: 2,
      name: "Team B",
    } as never;

    await resolver.createTeams([withPlayers, withoutPlayers], false, user);

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    const [inputs] = calculateSpy.mock.calls[0] as [IndexCalculationInput[]];
    expect(inputs).toHaveLength(1);
  });

  // T013: failure in batch throws GraphQLError and rolls back
  it("T013: throws GraphQLError and rolls back when calculate() returns a failure", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest
      .spyOn(Team, "create")
      .mockResolvedValue({
        id: "team-1",
        clubId: dbClub.id,
        type: SubEventTypeEnum.MX,
        setClub: jest.fn(),
        addPlayer: jest.fn(),
      } as never);
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockResolvedValue([{ id: "entry-1", meta: {}, save: jest.fn() } as never, true]);
    jest
      .spyOn(
        (resolver as unknown as { indexCalculationService: { calculate: jest.Mock } })
          .indexCalculationService,
        "calculate"
      )
      .mockResolvedValue([
        {
          _tag: "failure",
          key: "entry-1",
          error: {
            code: "PLAYER_NOT_FOUND",
            message: "Players not found: p-1",
            playerIds: ["p-1"],
          },
        },
      ] as never);

    const input: TeamNewInput = {
      clubId: CLUB_UUID,
      season: 2026,
      type: SubEventTypeEnum.MX,
      teamNumber: 1,
      name: "Team A",
      entry: {
        subEventId: "se-1",
        meta: { competition: { teamIndex: -1, players: [{ id: "p-1" }] } },
      },
    } as never;

    try {
      await resolver.createTeams([input], false, user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.PLAYER_NOT_FOUND);
    }
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  // T014: all teams already existed — calculate not called
  it("T014: does not call calculate() when all teams already existed (idempotent re-submit)", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
    const existingTeam = { id: "existing-team", clubId: dbClub.id } as unknown as Team;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    jest.spyOn(Team, "findOne").mockResolvedValue(existingTeam);
    const calculateSpy = jest.spyOn(
      (resolver as unknown as { indexCalculationService: { calculate: jest.Mock } })
        .indexCalculationService,
      "calculate"
    );

    const input: TeamNewInput = {
      clubId: CLUB_UUID,
      season: 2026,
      type: SubEventTypeEnum.MX,
      teamNumber: 1,
      name: "Team A",
      link: "existing-link",
    } as never;

    const results = await resolver.createTeams([input], false, user);

    expect(calculateSpy).not.toHaveBeenCalled();
    expect(results[0].alreadyExisted).toBe(true);
  });

  // T018: calculate called with correct input count
  it("T018: calculate() input count matches number of teams with player metadata", async () => {
    const dbClub = { id: CLUB_UUID, name: "Test club" } as unknown as Club;
    jest.spyOn(Club, "findByPk").mockResolvedValue(dbClub);
    let counter = 0;
    jest
      .spyOn(Team, "create")
      .mockImplementation(
        () =>
          ({
            id: `team-${++counter}`,
            clubId: dbClub.id,
            type: SubEventTypeEnum.MX,
            setClub: jest.fn(),
            addPlayer: jest.fn(),
          }) as never
      );
    jest
      .spyOn(EventEntry, "findOrCreate")
      .mockImplementation(() =>
        Promise.resolve([{ id: `entry-${counter}`, meta: {}, save: jest.fn() } as never, true])
      );
    const calculateSpy = jest
      .spyOn(
        (resolver as unknown as { indexCalculationService: { calculate: jest.Mock } })
          .indexCalculationService,
        "calculate"
      )
      .mockResolvedValue([
        {
          _tag: "success",
          key: "entry-1",
          index: 5,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
        {
          _tag: "success",
          key: "entry-3",
          index: 8,
          contributingPlayers: [],
          missingPlayerCount: 0,
          resolvedPlayers: [],
        },
      ] as never);

    const makeTeam = (n: number, withPlayers: boolean): TeamNewInput =>
      ({
        clubId: CLUB_UUID,
        season: 2026,
        type: SubEventTypeEnum.MX,
        teamNumber: n,
        name: `Team ${n}`,
        ...(withPlayers
          ? {
              entry: {
                subEventId: `se-${n}`,
                meta: { competition: { teamIndex: -1, players: [{ id: `p-${n}` }] } },
              },
            }
          : {}),
      }) as never;

    // 2 with players, 1 without — expect input count = 2
    await resolver.createTeams(
      [makeTeam(1, true), makeTeam(2, false), makeTeam(3, true)],
      false,
      user
    );

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    const [inputs] = calculateSpy.mock.calls[0] as [IndexCalculationInput[]];
    expect(inputs).toHaveLength(2);
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
        {
          provide: IndexCalculationService,
          useValue: {
            calculate: jest.fn().mockResolvedValue([]),
            calculateOne: jest.fn().mockResolvedValue({
              _tag: "success",
              key: "team-key",
              index: 0,
              contributingPlayers: [],
              missingPlayerCount: 0,
              resolvedPlayers: [],
            }),
          },
        },
        {
          provide: TeamAssociationService,
          useValue: teamAssociationServiceStub(),
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

  it("commits and returns team when a roster-only edit succeeds", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 3 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);

    const result = await resolver.updateTeam(baseInput({ season: 2026 }), user);

    expect(dbTeam._update).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(result).toBe(dbTeam);
  });

  it("does not throw when type changes", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ type: SubEventTypeEnum.M });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);

    const result = await resolver.updateTeam(baseInput({ type: SubEventTypeEnum.MX }), user);

    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(result).toBe(dbTeam);
  });

  it("succeeds and does not call generateName (teamNumber is frozen)", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam();
    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    const nameSpy = jest.spyOn(Team, "generateName");

    await resolver.updateTeam(baseInput({ season: 2027 }), user);

    // generateName must NOT be called — teamNumber is not changed by updateTeam
    expect(nameSpy).not.toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  it("does not write teamNumber even when supplied in the input (FR-004)", async () => {
    // The TypeScript type no longer has teamNumber in TeamUpdateInput, so this
    // tests the runtime path as a belt-and-suspenders check.
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 3 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);

    // Cast to bypass TypeScript since the field no longer exists on the type
    await resolver.updateTeam(baseInput() as TeamUpdateInput, user);

    // The team's teamNumber should remain 3 — not modified by updateTeam
    expect(dbTeam.teamNumber).toBe(3);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  it("does not invoke Team.findOne (no conflict-check on teamNumber anymore)", async () => {
    const user = userWithPermission(true);
    const dbTeam = stubDbTeam({ teamNumber: 3 });

    jest.spyOn(Team, "findByPk").mockResolvedValue(dbTeam);
    const findOneSpy = jest.spyOn(Team, "findOne");

    await resolver.updateTeam(baseInput(), user);

    // findOne was removed from updateTeam; it was only used for the conflict check
    expect(findOneSpy).not.toHaveBeenCalled();
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
});
