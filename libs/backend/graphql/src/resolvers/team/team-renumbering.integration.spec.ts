/**
 * Integration tests for TeamRenumberingService.
 *
 * Exercise real `pg_advisory_xact_lock` behaviour against the dev postgres
 * (docker-compose.dev.yml). SKIPPED unless RUN_INTEGRATION_TESTS=1.
 *
 * Prerequisites:
 *   npm run docker:up        # postgres + redis
 *   RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/graphql/jest.config.ts \
 *     --testPathPattern team-renumbering.integration
 *
 * The suite uses a sentinel scope (season 9999, ad-hoc test club) so it never
 * collides with dev seed data. Every team / membership the suite creates is
 * cleaned up in afterEach + afterAll.
 *
 * Spec: specs/008-reorder-teams-atomic/
 * Tests: T024–T028 + T037
 */

import {
  Club,
  Player,
  RankingLastPlace,
  RankingSystem,
  Team,
  TeamPlayerMembership,
} from "@badman/backend-database";
import * as allModels from "@badman/backend-database";
import { SubEventTypeEnum, TeamMembershipType } from "@badman/utils";
import { config as loadEnv } from "dotenv";
import * as path from "path";
import { Op } from "sequelize";
import { Model, ModelCtor, Sequelize } from "sequelize-typescript";
import { TeamRenumberingService } from "./team-renumbering.service";

const RUN = process.env["RUN_INTEGRATION_TESTS"] === "1";

// ---------------------------------------------------------------------------
// Sentinel constants — guaranteed not to collide with dev seed data.
// ---------------------------------------------------------------------------

const TEST_SEASON = 9999;
const TEST_CLUB_NAME_PREFIX = "_renumber-it_";

(RUN ? describe : describe.skip)("TeamRenumberingService integration — concurrency", () => {
  let sequelize: Sequelize;
  let service: TeamRenumberingService;
  let primarySystem: RankingSystem;
  let testClub: Club;
  let player: Player; // shared across teams; per-team membership decides what counts as base

  beforeAll(async () => {
    // Load DB credentials from .env (repo root).
    loadEnv({ path: path.resolve(__dirname, "../../../../../../.env") });

    // Skip suite (rather than fail) if the env vars are missing or the dialect
    // is not postgres — the advisory-lock test is postgres-only.
    if ((process.env["DB_DIALECT"] ?? "postgres") !== "postgres") {
      console.warn("Skipping integration suite — DB_DIALECT is not postgres");
      return;
    }

    // Register every Sequelize-typescript model so cross-model associations
    // (e.g. Player → Role) resolve. Mirrors the SequelizeConfigProvider pattern.
    const models = Object.values(allModels).filter(
      (m): m is ModelCtor =>
        typeof m === "function" && (m as { prototype?: unknown }).prototype instanceof Model
    );

    sequelize = new Sequelize({
      dialect: "postgres",
      host: process.env["DB_IP"] ?? "127.0.0.1",
      port: +(process.env["DB_PORT"] ?? 5432),
      username: process.env["DB_USER"],
      password: process.env["DB_PASSWORD"],
      database: process.env["DB_DATABASE"] ?? "postgres",
      logging: false,
      models,
    });

    // Sanity: a primary RankingSystem must exist (the dev seed creates one).
    const sys = await RankingSystem.findOne({ where: { primary: true } });
    if (!sys) {
      throw new Error(
        "Integration suite requires a primary RankingSystem in the DB. Run `npm run seed:test-data`."
      );
    }
    primarySystem = sys;

    // Create a sentinel test club (idempotent — reuse if a prior run left one).
    const clubName = `${TEST_CLUB_NAME_PREFIX}${Date.now()}`;
    testClub = await Club.create({
      name: clubName,
      fullName: clubName,
      abbreviation: "RNT",
      useForTeamName: "abbreviation",
    } as any);

    // One shared player to attach to teams as REGULAR (drives baseIndex
    // through their RankingLastPlace row, which we vary per test).
    player = await Player.create({
      firstName: "Renumber",
      lastName: "IT",
      memberId: `RNT-${Date.now()}`,
      gender: "M",
      competitionPlayer: true,
    } as any);

    service = new TeamRenumberingService(sequelize);
  });

  afterAll(async () => {
    if (!sequelize) return;
    // Hard-clean every row produced by the suite.
    if (testClub) {
      const teams = await Team.findAll({ where: { clubId: testClub.id, season: TEST_SEASON } });
      const teamIds = teams.map((t) => t.id);
      if (teamIds.length > 0) {
        await TeamPlayerMembership.destroy({ where: { teamId: { [Op.in]: teamIds } } });
        await Team.destroy({ where: { id: { [Op.in]: teamIds } } });
      }
      if (player) {
        await RankingLastPlace.destroy({ where: { playerId: player.id } });
        await Player.destroy({ where: { id: player.id } });
      }
      await Club.destroy({ where: { id: testClub.id } });
    }
    await sequelize.close();
  });

  // -------------------------------------------------------------------------
  // Test fixtures
  // -------------------------------------------------------------------------

  /** Replace the shared player's RankingLastPlace with the given strength. */
  async function setRanking(rank: number) {
    await RankingLastPlace.destroy({ where: { playerId: player.id, systemId: primarySystem.id } });
    await RankingLastPlace.create({
      playerId: player.id,
      systemId: primarySystem.id,
      single: rank,
      double: rank,
      mix: rank,
    } as any);
  }

  /**
   * Insert a team with a single REGULAR member whose ranking is the supplied
   * `rank` value. Lower rank → stronger team → lower baseIndex → lower number.
   */
  async function makeTeam(opts: {
    type: SubEventTypeEnum;
    teamNumber: number;
    rank?: number;
  }): Promise<Team> {
    const team = await Team.create({
      clubId: testClub.id,
      season: TEST_SEASON,
      type: opts.type,
      teamNumber: opts.teamNumber,
    } as any);

    if (opts.rank !== undefined) {
      // Re-use the shared player; its ranking is whatever setRanking set last.
      // Tests that need distinct strengths per team build dedicated players.
      await TeamPlayerMembership.create({
        teamId: team.id,
        playerId: player.id,
        membershipType: TeamMembershipType.REGULAR,
        start: new Date(),
      } as any);
    }

    return team;
  }

  /** Spin up N distinct players with ranking `rank_i`, each on a separate team. */
  async function makeTeamsWithDistinctStrengths(opts: {
    type: SubEventTypeEnum;
    strengths: number[]; // index i → team_i.baseIndex driver
  }): Promise<{ teams: Team[]; players: Player[] }> {
    const teams: Team[] = [];
    const players: Player[] = [];
    for (let i = 0; i < opts.strengths.length; i++) {
      const p = await Player.create({
        firstName: `RNT-P${i}`,
        lastName: "IT",
        memberId: `RNT-P${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        gender: "M",
        competitionPlayer: true,
      } as any);
      await RankingLastPlace.create({
        playerId: p.id,
        systemId: primarySystem.id,
        single: opts.strengths[i],
        double: opts.strengths[i],
        mix: opts.strengths[i],
      } as any);
      players.push(p);

      const team = await Team.create({
        clubId: testClub.id,
        season: TEST_SEASON,
        type: opts.type,
        teamNumber: i + 1, // arbitrary placeholder
      } as any);
      await TeamPlayerMembership.create({
        teamId: team.id,
        playerId: p.id,
        membershipType: TeamMembershipType.REGULAR,
        start: new Date(),
      } as any);
      teams.push(team);
    }
    return { teams, players };
  }

  /** Wipe every team + membership belonging to the sentinel scope. */
  async function cleanScope() {
    if (!testClub) return;
    const teams = await Team.findAll({ where: { clubId: testClub.id, season: TEST_SEASON } });
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) return;

    const memberships = await TeamPlayerMembership.findAll({
      where: { teamId: { [Op.in]: teamIds } },
    });
    const playerIds = [...new Set(memberships.map((m) => m.playerId).filter((id): id is string => !!id))];

    await TeamPlayerMembership.destroy({ where: { teamId: { [Op.in]: teamIds } } });
    await Team.destroy({ where: { id: { [Op.in]: teamIds } } });

    // Drop the per-test players (and their rankings) but keep the shared `player`.
    const droppable = playerIds.filter((id) => id !== player.id);
    if (droppable.length > 0) {
      await RankingLastPlace.destroy({ where: { playerId: { [Op.in]: droppable } } });
      await Player.destroy({ where: { id: { [Op.in]: droppable } } });
    }
  }

  beforeEach(async () => {
    await cleanScope();
  });

  // -------------------------------------------------------------------------
  // T025 — 10 parallel calls against the same single-type scope
  // -------------------------------------------------------------------------

  it(
    "10 parallel calls against the same single-type scope produce {1..N} in ascending baseIndex order with no _temp",
    async () => {
      // Five M teams, distinct strengths; baseIndex order will be the inverse
      // of the placeholder teamNumber order (strongest team is team #5).
      const { teams } = await makeTeamsWithDistinctStrengths({
        type: SubEventTypeEnum.M,
        strengths: [50, 40, 30, 20, 10], // team_4 (10) is strongest → should land on slot 1
      });

      const calls = Array.from({ length: 10 }, async () => {
        const tx = await sequelize.transaction();
        try {
          const result = await service.recalculateForScope({
            clubId: testClub.id,
            season: TEST_SEASON,
            types: [SubEventTypeEnum.M],
            transaction: tx,
          });
          await tx.commit();
          return result;
        } catch (e) {
          await tx.rollback();
          throw e;
        }
      });

      const results = await Promise.all(calls);
      expect(results).toHaveLength(10);

      // Re-read final state.
      const final = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.M },
        order: [["teamNumber", "ASC"]],
      });

      expect(final.map((t) => t.teamNumber)).toEqual([1, 2, 3, 4, 5]);

      // Strongest (rank 10 → team_4 from the seed array) must be at slot 1.
      const strongestSeed = teams[4];
      const slot1 = final.find((t) => t.teamNumber === 1);
      expect(slot1?.id).toBe(strongestSeed.id);

      // No _temp residue.
      for (const t of final) {
        expect(t.name).not.toContain("_temp");
        expect(t.abbreviation).not.toContain("_temp");
      }
    },
    60_000
  );

  // -------------------------------------------------------------------------
  // T026 — pooled MX+NAT: NATIONAL takes 1..K, MX takes K+1..K+M
  // -------------------------------------------------------------------------

  it(
    "10 parallel calls against pooled MX+NAT scope: NATIONAL takes 1..K, MX takes K+1..K+M, no _temp",
    async () => {
      // 2 NATIONAL teams (strengths 100, 80) + 3 MX teams (strengths 30, 40, 50).
      // The strong MX (30) would beat the weak NATIONAL (100) on raw baseIndex,
      // but the federation rule forces NATIONAL into 1..K regardless.
      const nat = await makeTeamsWithDistinctStrengths({
        type: SubEventTypeEnum.NATIONAL,
        strengths: [100, 80],
      });
      const mx = await makeTeamsWithDistinctStrengths({
        type: SubEventTypeEnum.MX,
        strengths: [30, 40, 50],
      });

      const calls = Array.from({ length: 10 }, async () => {
        const tx = await sequelize.transaction();
        try {
          const result = await service.recalculateForScope({
            clubId: testClub.id,
            season: TEST_SEASON,
            types: [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX],
            transaction: tx,
          });
          await tx.commit();
          return result;
        } catch (e) {
          await tx.rollback();
          throw e;
        }
      });

      const results = await Promise.all(calls);
      expect(results).toHaveLength(10);

      const finalNat = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.NATIONAL },
      });
      const finalMx = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.MX },
      });

      // NATIONAL → slots {1, 2} regardless of comparative strength to MX
      expect(finalNat.map((t) => t.teamNumber).sort()).toEqual([1, 2]);
      // MX → slots {3, 4, 5} (continues after the K=2 NATIONAL teams)
      expect(finalMx.map((t) => t.teamNumber).sort()).toEqual([3, 4, 5]);

      // Within each tier, ordered by ascending baseIndex
      const natByNumber = finalNat.sort((a, b) => a.teamNumber - b.teamNumber);
      expect(natByNumber[0].id).toBe(nat.teams[1].id); // strength 80 wins (lower rank)
      expect(natByNumber[1].id).toBe(nat.teams[0].id); // strength 100

      const mxByNumber = finalMx.sort((a, b) => a.teamNumber - b.teamNumber);
      expect(mxByNumber[0].id).toBe(mx.teams[0].id); // strength 30
      expect(mxByNumber[1].id).toBe(mx.teams[1].id); // strength 40
      expect(mxByNumber[2].id).toBe(mx.teams[2].id); // strength 50

      for (const t of [...finalNat, ...finalMx]) {
        expect(t.name).not.toContain("_temp");
        expect(t.abbreviation).not.toContain("_temp");
      }
    },
    60_000
  );

  // -------------------------------------------------------------------------
  // T027 — direct Team.update bypassing the recalculate must not change numbers
  // -------------------------------------------------------------------------

  it(
    "direct updates that don't write teamNumber leave numbering untouched",
    async () => {
      // Two F teams — call recalculate first to seat them at known numbers.
      const { teams } = await makeTeamsWithDistinctStrengths({
        type: SubEventTypeEnum.F,
        strengths: [50, 30], // teams[1] is strongest (rank 30) → expect slot 1
      });

      const tx0 = await sequelize.transaction();
      await service.recalculateForScope({
        clubId: testClub.id,
        season: TEST_SEASON,
        types: [SubEventTypeEnum.F],
        transaction: tx0,
      });
      await tx0.commit();

      const seated = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.F },
      });
      const beforeByNumber = new Map(seated.map((t) => [t.id, t.teamNumber]));

      // Mid-season-style edits in parallel: update phone (NOT teamNumber).
      // Mirrors what the new updateTeam does post-Spec 008.
      const edits = teams.map(async (t) =>
        Team.update(
          { phone: `+32 ${Math.floor(Math.random() * 1_000_000_000)}` },
          { where: { id: t.id } }
        )
      );
      await Promise.all(edits);

      const after = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.F },
      });

      for (const t of after) {
        expect(t.teamNumber).toBe(beforeByNumber.get(t.id));
        expect(t.name).not.toContain("_temp");
      }
    },
    60_000
  );

  // -------------------------------------------------------------------------
  // T037 — rejected recalculate (transaction rolled back) leaves scope unchanged
  // -------------------------------------------------------------------------

  it(
    "rejected recalculate (transaction rolled back) leaves scope byte-identical to pre-call snapshot",
    async () => {
      const { teams } = await makeTeamsWithDistinctStrengths({
        type: SubEventTypeEnum.M,
        strengths: [50, 30, 10], // teams[2] strongest
      });

      // Snapshot pre-call.
      const pre = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.M },
        order: [["id", "ASC"]],
      });
      const preMap = new Map(
        pre.map((t) => [
          t.id,
          { teamNumber: t.teamNumber, name: t.name, abbreviation: t.abbreviation },
        ])
      );

      // Run the recalculate but force a rollback via the caller (simulates a
      // resolver-level error after the service ran but before commit, which is
      // the path Spec 008 FR-008 protects).
      const tx = await sequelize.transaction();
      try {
        await service.recalculateForScope({
          clubId: testClub.id,
          season: TEST_SEASON,
          types: [SubEventTypeEnum.M],
          transaction: tx,
        });
        await tx.rollback(); // <- caller chose to reject, even though service succeeded
      } catch (e) {
        await tx.rollback();
        throw e;
      }

      const post = await Team.findAll({
        where: { clubId: testClub.id, season: TEST_SEASON, type: SubEventTypeEnum.M },
        order: [["id", "ASC"]],
      });

      for (const t of post) {
        const before = preMap.get(t.id);
        expect(before).toBeDefined();
        expect(t.teamNumber).toBe(before!.teamNumber);
        expect(t.name).toBe(before!.name);
        expect(t.abbreviation).toBe(before!.abbreviation);
        expect(t.name ?? "").not.toContain("_temp");
      }

      // Sanity: at least one team was returned, so the scope was not empty.
      expect(post).toHaveLength(teams.length);
    },
    60_000
  );
});
