import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { Player, RankingLastPlace, RankingSystem, Team } from "@badman/backend-database";
import { SubEventTypeEnum, TeamMembershipType } from "@badman/utils";
import { TeamRenumberingService } from "./team-renumbering.service";
import { Transaction } from "sequelize";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake transaction */
const fakeTransaction = () => ({}) as unknown as Transaction;

/** Build a RankingSystem stub */
const fakeSystem = (amountOfLevels = 12) =>
  ({ id: "sys-uuid", primary: true, amountOfLevels }) as unknown as RankingSystem;

/** Build a RankingLastPlace stub */
const fakeRanking = (playerId: string, single = 6, double = 6, mix = 6): RankingLastPlace =>
  ({ playerId, single, double, mix, systemId: "sys-uuid" }) as unknown as RankingLastPlace;

/** Build a Player stub with a REGULAR TeamPlayerMembership join row */
const fakePlayer = (
  id: string,
  gender: "M" | "F" = "M",
  membershipType: TeamMembershipType = TeamMembershipType.REGULAR
): Player & { TeamPlayerMembership: { membershipType: TeamMembershipType } } =>
  ({
    id,
    gender,
    TeamPlayerMembership: { membershipType },
  }) as unknown as Player & { TeamPlayerMembership: { membershipType: TeamMembershipType } };

/** Build a Team stub with a players list and a teamNumber */
const fakeTeam = (
  id: string,
  teamNumber: number,
  players: ReturnType<typeof fakePlayer>[],
  type: SubEventTypeEnum = SubEventTypeEnum.M
): Team & { _baseIndex?: number } => {
  const save = jest.fn().mockImplementation(function (this: Team) {
    // BeforeUpdate hook is not called in tests (mocked save); the service sets teamNumber directly
    return Promise.resolve(this);
  });
  const team = {
    id,
    teamNumber,
    type,
    players,
    name: `Club ${teamNumber}H`,
    abbreviation: `C ${teamNumber}H`,
    save,
    _save: save,
  } as unknown as Team & { _baseIndex?: number; _save: jest.Mock };
  return team;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeamRenumberingService.recalculateForScope", () => {
  let service: TeamRenumberingService;
  let mockSequelize: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    mockSequelize = {
      query: jest.fn().mockResolvedValue(undefined), // advisory lock
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamRenumberingService,
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = module.get<TeamRenumberingService>(TeamRenumberingService);
  });

  afterEach(() => jest.restoreAllMocks());

  // --------------------------------------------------------------------------
  // Empty scope → returns []
  // --------------------------------------------------------------------------

  it("returns empty array and does no writes when scope has no teams", async () => {
    const tx = fakeTransaction();

    jest.spyOn(Team, "findAll").mockResolvedValue([]);
    // System lookup should NOT be called if no teams
    const systemSpy = jest.spyOn(RankingSystem, "findOne");

    const result = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    expect(result).toHaveLength(0);
    // Advisory lock still acquired
    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.any(Object)
    );
    // No DB reads for system since scope is empty
    expect(systemSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Single team in scope → always number 1
  // --------------------------------------------------------------------------

  it("assigns teamNumber 1 to a single team in scope (already 1 → no write)", async () => {
    const tx = fakeTransaction();
    const p1 = fakePlayer("p1");
    const team = fakeTeam("t1", 1, [p1]);

    jest.spyOn(Team, "findAll").mockResolvedValue([team] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([fakeRanking("p1")]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    expect(results).toHaveLength(1);
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[0].changed).toBe(false);
    expect((team as unknown as { _save: jest.Mock })._save).not.toHaveBeenCalled();
  });

  it("assigns teamNumber 1 to a single team in scope (number was wrong → write)", async () => {
    const tx = fakeTransaction();
    const p1 = fakePlayer("p1");
    const team = fakeTeam("t1", 3, [p1]); // wrong number

    jest.spyOn(Team, "findAll").mockResolvedValue([team] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([fakeRanking("p1")]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    expect(results[0].team.teamNumber).toBe(1);
    expect(results[0].changed).toBe(true);
    expect((team as unknown as { _save: jest.Mock })._save).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: tx })
    );
  });

  // --------------------------------------------------------------------------
  // Group already correct → no writes
  // --------------------------------------------------------------------------

  it("makes no writes when group is already correctly numbered in ascending baseIndex order", async () => {
    const tx = fakeTransaction();
    // Team 1 is stronger (lower baseIndex) because its player has ranking 3 vs team2's player at 9
    const p1 = fakePlayer("p1", "M");
    const p2 = fakePlayer("p2", "M");
    const team1 = fakeTeam("t1", 1, [p1]); // should be #1
    const team2 = fakeTeam("t2", 2, [p2]); // should be #2

    jest.spyOn(Team, "findAll").mockResolvedValue([team1, team2] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("p1", 3, 3, 3), // lower = stronger → gets #1
      fakeRanking("p2", 9, 9, 9), // higher = weaker → gets #2
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    expect(results[0].changed).toBe(false);
    expect(results[1].changed).toBe(false);
    expect((team1 as unknown as { _save: jest.Mock })._save).not.toHaveBeenCalled();
    expect((team2 as unknown as { _save: jest.Mock })._save).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Group wrong order → writes only changed rows
  // --------------------------------------------------------------------------

  it("writes only the teams whose teamNumber changes", async () => {
    const tx = fakeTransaction();
    // p1 has worse ranking than p2 → team1 should be #2, team2 should be #1
    const p1 = fakePlayer("p1", "M");
    const p2 = fakePlayer("p2", "M");
    const team1 = fakeTeam("t1", 1, [p1]); // currently #1 but should be #2
    const team2 = fakeTeam("t2", 2, [p2]); // currently #2 but should be #1

    jest.spyOn(Team, "findAll").mockResolvedValue([team1, team2] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("p1", 9, 9, 9), // weaker → should be #2
      fakeRanking("p2", 3, 3, 3), // stronger → should be #1
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // Both changed because their numbers swapped
    expect(results).toHaveLength(2);
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[0].changed).toBe(true);
    expect(results[1].team.teamNumber).toBe(2);
    expect(results[1].changed).toBe(true);

    expect((team2 as unknown as { _save: jest.Mock })._save).toHaveBeenCalled();
    expect((team1 as unknown as { _save: jest.Mock })._save).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Tie on baseIndex → ordered by id ASC
  // --------------------------------------------------------------------------

  it("breaks ties on baseIndex by Team.id ascending", async () => {
    const tx = fakeTransaction();
    // Both teams have identical rankings → tie-break by id
    const p1 = fakePlayer("p1", "M");
    const p2 = fakePlayer("p2", "M");
    // Team with lower id should get #1
    const teamA = fakeTeam("aaa", 2, [p1]); // id='aaa' → should be #1 after tie-break
    const teamB = fakeTeam("bbb", 1, [p2]); // id='bbb' → should be #2 after tie-break

    // findAll returns in id ASC order (as the service requests)
    jest.spyOn(Team, "findAll").mockResolvedValue([teamA, teamB] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("p1", 5, 5, 5), // same ranking
      fakeRanking("p2", 5, 5, 5), // same ranking
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // 'aaa' < 'bbb' → teamA gets #1, teamB gets #2
    expect(results[0].team.id).toBe("aaa");
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[1].team.id).toBe("bbb");
    expect(results[1].team.teamNumber).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Missing rankings → uses getIndexFromPlayers default
  // --------------------------------------------------------------------------

  it("uses default baseIndex when player has no RankingLastPlace row", async () => {
    const tx = fakeTransaction();
    const p1 = fakePlayer("p1", "M");
    const p2 = fakePlayer("p2", "M");
    // team1 has no ranking for p1 → default → weaker
    // team2 has strong ranking for p2 → stronger → #1
    const team1 = fakeTeam("t1", 1, [p1]);
    const team2 = fakeTeam("t2", 2, [p2]);

    jest.spyOn(Team, "findAll").mockResolvedValue([team1, team2] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem(12));
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      // Only p2 has a ranking row; p1 has none → uses default
      fakeRanking("p2", 2, 2, 2), // strong → should be #1
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // team2 (strong p2) should be #1, team1 (default ranking) should be #2
    expect(results[0].team.id).toBe("t2");
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[1].team.id).toBe("t1");
    expect(results[1].team.teamNumber).toBe(2);
  });

  // --------------------------------------------------------------------------
  // BACKUP players are excluded from baseIndex
  // --------------------------------------------------------------------------

  it("ignores BACKUP members when computing baseIndex", async () => {
    const tx = fakeTransaction();
    // team1: one strong REGULAR + one BACKUP weak
    // team2: one weak REGULAR
    const p1Regular = fakePlayer("p1", "M", TeamMembershipType.REGULAR); // strong
    const p1Backup = fakePlayer("pb", "M", TeamMembershipType.BACKUP); // backup (ignored)
    const p2Regular = fakePlayer("p2", "M", TeamMembershipType.REGULAR); // weak

    const team1 = fakeTeam("t1", 2, [p1Regular, p1Backup]); // strong REGULAR → should be #1
    const team2 = fakeTeam("t2", 1, [p2Regular]); // weak REGULAR → should be #2

    jest.spyOn(Team, "findAll").mockResolvedValue([team1, team2] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("p1", 2, 2, 2), // strong REGULAR
      fakeRanking("pb", 2, 2, 2), // BACKUP — should NOT affect baseIndex
      fakeRanking("p2", 10, 10, 10), // weak REGULAR
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // team1 (strong REGULAR only) → #1; team2 (weak REGULAR) → #2
    expect(results[0].team.id).toBe("t1");
    expect(results[0].team.teamNumber).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Pooled MX+NAT: NATIONAL takes 1..K, MX takes K+1..K+M
  // --------------------------------------------------------------------------

  it("assigns NATIONAL teams 1..K and MX teams K+1..K+M in pooled scope", async () => {
    const tx = fakeTransaction();
    const pNat = fakePlayer("pNat", "M");
    const pMx1 = fakePlayer("pMx1", "M");
    const pMx2 = fakePlayer("pMx2", "F");

    const national = fakeTeam("nat1", 3, [pNat], SubEventTypeEnum.NATIONAL);
    const mx1 = fakeTeam("mx1", 1, [pMx1], SubEventTypeEnum.MX);
    const mx2 = fakeTeam("mx2", 2, [pMx2], SubEventTypeEnum.MX);

    // findAll called twice: once for NATIONAL tier, once for MX tier
    jest
      .spyOn(Team, "findAll")
      .mockResolvedValueOnce([national] as Team[]) // NATIONAL tier
      .mockResolvedValueOnce([mx1, mx2] as Team[]); // MX tier

    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("pNat", 5, 5, 5),
      fakeRanking("pMx1", 3, 3, 3), // stronger than national by baseIndex, but NATIONAL wins tier
      fakeRanking("pMx2", 8, 8, 8),
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX],
      transaction: tx,
    });

    expect(results).toHaveLength(3);
    // NATIONAL gets #1 (regardless of baseIndex vs MX)
    expect(results[0].team.id).toBe("nat1");
    expect(results[0].team.teamNumber).toBe(1);
    // MX teams follow from #2
    expect(results[1].team.teamNumber).toBe(2);
    expect(results[2].team.teamNumber).toBe(3);
  });

  it("strong MX (lower baseIndex than NATIONAL) still gets a higher number than NATIONAL", async () => {
    const tx = fakeTransaction();
    const pNat = fakePlayer("pNat", "M");
    const pMx = fakePlayer("pMx", "M");

    const national = fakeTeam("nat1", 1, [pNat], SubEventTypeEnum.NATIONAL);
    const mx = fakeTeam("mx1", 2, [pMx], SubEventTypeEnum.MX);

    jest
      .spyOn(Team, "findAll")
      .mockResolvedValueOnce([national] as Team[]) // NATIONAL tier
      .mockResolvedValueOnce([mx] as Team[]); // MX tier

    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("pNat", 10, 10, 10), // NATIONAL is actually weaker by index
      fakeRanking("pMx", 2, 2, 2), // MX is stronger by index — BUT tier wins
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX],
      transaction: tx,
    });

    // NATIONAL still gets #1 (tier ordering overrides per-team baseIndex)
    expect(results[0].team.id).toBe("nat1");
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[1].team.id).toBe("mx1");
    expect(results[1].team.teamNumber).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Scope key derivation + advisory lock
  // --------------------------------------------------------------------------

  it("acquires advisory lock with correct key for single-type M scope", async () => {
    const tx = fakeTransaction();
    jest.spyOn(Team, "findAll").mockResolvedValue([]);

    await service.recalculateForScope({
      clubId: "club123",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    expect(mockSequelize.query).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      expect.objectContaining({
        bind: ["teams_renumber:club123:2026:M"],
      })
    );
  });

  it("acquires advisory lock with MX+NAT key for NATIONAL-only scope", async () => {
    const tx = fakeTransaction();
    jest.spyOn(Team, "findAll").mockResolvedValue([]);

    await service.recalculateForScope({
      clubId: "club123",
      season: 2026,
      types: [SubEventTypeEnum.NATIONAL],
      transaction: tx,
    });

    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        bind: ["teams_renumber:club123:2026:MX+NAT"],
      })
    );
  });

  it("acquires advisory lock with MX+NAT key for pooled NATIONAL+MX scope", async () => {
    const tx = fakeTransaction();
    jest.spyOn(Team, "findAll").mockResolvedValue([]);

    await service.recalculateForScope({
      clubId: "club123",
      season: 2026,
      types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX],
      transaction: tx,
    });

    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        bind: ["teams_renumber:club123:2026:MX+NAT"],
      })
    );
  });

  it("throws INTERNAL_ERROR for unsupported scope shape", async () => {
    const tx = fakeTransaction();

    try {
      await service.recalculateForScope({
        clubId: "c",
        season: 2026,
        types: [SubEventTypeEnum.MX, SubEventTypeEnum.NATIONAL], // wrong order
        transaction: tx,
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
    }
  });

  // --------------------------------------------------------------------------
  // Primary RankingSystem missing → INTERNAL_ERROR
  // --------------------------------------------------------------------------

  it("throws INTERNAL_ERROR and does not write when primary RankingSystem is missing", async () => {
    const tx = fakeTransaction();
    const p1 = fakePlayer("p1");
    const team = fakeTeam("t1", 1, [p1]);

    jest.spyOn(Team, "findAll").mockResolvedValue([team] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(null);
    const saveSpy = (team as unknown as { _save: jest.Mock })._save;

    try {
      await service.recalculateForScope({
        clubId: "club",
        season: 2026,
        types: [SubEventTypeEnum.M],
        transaction: tx,
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe("INTERNAL_ERROR");
    }

    expect(saveSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Only changed rows are written
  // --------------------------------------------------------------------------

  it("does not write rows whose teamNumber is already correct", async () => {
    const tx = fakeTransaction();
    const p1 = fakePlayer("p1", "M");
    const p2 = fakePlayer("p2", "M");
    const p3 = fakePlayer("p3", "M");
    // Rankings in ascending order → teams should be ordered t1 < t2 < t3
    const team1 = fakeTeam("t1", 1, [p1]); // correct → no write
    const team2 = fakeTeam("t2", 3, [p2]); // wrong → write
    const team3 = fakeTeam("t3", 2, [p3]); // wrong → write

    jest.spyOn(Team, "findAll").mockResolvedValue([team1, team2, team3] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem());
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([
      fakeRanking("p1", 2, 2, 2), // #1
      fakeRanking("p2", 4, 4, 4), // #2 after sorting
      fakeRanking("p3", 6, 6, 6), // #3 after sorting
    ]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // After sort: t1(idx~8) → #1, t2(idx~16) → #2, t3(idx~24) → #3
    // team1 was already #1 → not changed
    const team1Result = results.find((r) => r.team.id === "t1");
    expect(team1Result?.changed).toBe(false);
    expect((team1 as unknown as { _save: jest.Mock })._save).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Team with no base members → uses getIndexFromPlayers default
  // --------------------------------------------------------------------------

  it("computes baseIndex as all-default when team has no REGULAR members", async () => {
    const tx = fakeTransaction();
    // Team has only a BACKUP player (no REGULAR)
    const backup = fakePlayer("pb", "M", TeamMembershipType.BACKUP);
    const teamNoRegular = fakeTeam("t1", 1, [backup]);
    // Team with a strong REGULAR player
    const pStrong = fakePlayer("ps", "M");
    const teamWithRegular = fakeTeam("t2", 2, [pStrong]);

    jest.spyOn(Team, "findAll").mockResolvedValue([teamNoRegular, teamWithRegular] as Team[]);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fakeSystem(12));
    jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([fakeRanking("ps", 2, 2, 2)]);

    const results = await service.recalculateForScope({
      clubId: "club",
      season: 2026,
      types: [SubEventTypeEnum.M],
      transaction: tx,
    });

    // teamWithRegular has lower baseIndex → should be #1; teamNoRegular (all defaults) → #2
    expect(results[0].team.id).toBe("t2");
    expect(results[0].team.teamNumber).toBe(1);
    expect(results[1].team.id).toBe("t1");
    expect(results[1].team.teamNumber).toBe(2);
  });
});
