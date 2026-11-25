import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { parseEnv } from "util";
import { Op } from "sequelize";
import { Model, ModelCtor, Sequelize } from "sequelize-typescript";
import { SubEventTypeEnum, TeamMembershipType } from "@badman/utils";
import * as sequelizeModels from "../models";
import { Player, RankingPlace, RankingSystem, Team, TeamPlayerMembership } from "../models";

/**
 * Shared fixture for the ranking-lookup integration tests (BAD-409).
 *
 * It creates two ranking systems, four players and one team with fixed
 * publications around the 10 June cutoff of a sentinel season, so each caller's
 * lookup rule can be checked against real Postgres behaviour. Each place has a
 * distinct `single` level, so a test can tell which row a lookup returned.
 *
 * Integration tests only: they write to the database, so `connectRankingLookupDb`
 * refuses anything but a local Postgres. Every row carries the `bad409-` tag (and
 * the team the sentinel season), so leftovers of a crashed run are removed when
 * the next run creates the fixture.
 */
export const RANKING_LOOKUP_SEASON = 9999;

const TAG_PREFIX = "bad409-";

export type RankingLookupFixture = {
  systemA: RankingSystem;
  systemB: RankingSystem;
  /** Places in system A around the cutoff, including one exactly on 10 June 00:00. */
  exact: Player;
  /** A place in system A on 1 June and a newer one in system B on 5 June. */
  twoSystems: Player;
  /** Only a place after the cutoff. */
  noPlace: Player;
  /** Only a weekly (non-update) place before the cutoff. */
  weeklyOnly: Player;
  /** A team with all four players as members. */
  team: Team;
  cleanup: () => Promise<void>;
};

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

/**
 * Copies the repo root `.env` into `env`, without overriding set variables.
 * (Not `process.loadEnvFile`: Jest gives each test file its own copy of
 * `process.env`, which that would not update.)
 */
function loadRootEnv(env: NodeJS.ProcessEnv): void {
  let dir = __dirname;
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
  const envFile = join(dir, ".env");
  if (!existsSync(envFile)) {
    return;
  }
  for (const [key, value] of Object.entries(parseEnv(readFileSync(envFile, "utf8")))) {
    env[key] ??= value;
  }
}

/**
 * Connects to the dev Postgres from the environment (DB_* variables, read from
 * the repo root `.env`), or returns null when the suite should skip: integration
 * tests not enabled, not Postgres, or not a local database.
 */
export function connectRankingLookupDb(env = process.env): Sequelize | null {
  if (env["RUN_INTEGRATION_TESTS"] !== "1") {
    return null;
  }
  loadRootEnv(env);
  if (env["DB_DIALECT"] !== "postgres") {
    console.warn("Ranking lookup integration tests need DB_DIALECT=postgres; skipping.");
    return null;
  }
  if (!LOCAL_HOSTS.includes(env["DB_IP"] ?? "")) {
    console.warn("Ranking lookup integration tests only run against a local database; skipping.");
    return null;
  }

  const models = Object.values(sequelizeModels).filter(
    (m) => typeof m === "function" && m.prototype instanceof Model
  ) as ModelCtor[];

  return new Sequelize({
    dialect: "postgres",
    host: env["DB_IP"],
    port: Number(env["DB_PORT"] ?? 5432),
    username: env["DB_USER"],
    password: env["DB_PASSWORD"],
    database: env["DB_DATABASE"],
    logging: false,
    models,
  });
}

/**
 * Midnight in Brussels of a day in the sentinel season, e.g. `stored("06-10")`:
 * production runs with TZ=Europe/Brussels, so the ranking sync stores
 * publication dates that way. All fixture dates fall in summer time (+02:00).
 */
const stored = (monthDay: string) =>
  new Date(`${RANKING_LOOKUP_SEASON}-${monthDay}T00:00:00.000+02:00`);

/** Removes rows left behind by an earlier run that crashed before its cleanup. */
async function removeLeftovers(): Promise<void> {
  const tagged = { [Op.like]: `${TAG_PREFIX}%` };
  const players = await Player.findAll({ attributes: ["id"], where: { lastName: tagged } });
  const teams = await Team.findAll({
    attributes: ["id"],
    where: { season: RANKING_LOOKUP_SEASON, name: tagged },
  });
  const playerIds = players.map((p) => p.id);
  const teamIds = teams.map((t) => t.id);

  if (playerIds.length > 0) {
    await RankingPlace.destroy({ where: { playerId: playerIds }, hooks: false });
  }
  if (teamIds.length > 0) {
    await TeamPlayerMembership.destroy({ where: { teamId: teamIds }, hooks: false });
    await Team.destroy({ where: { id: teamIds }, hooks: false });
  }
  if (playerIds.length > 0) {
    await Player.destroy({ where: { id: playerIds }, hooks: false });
  }
  await RankingSystem.destroy({ where: { name: tagged }, hooks: false });
}

export async function createRankingLookupFixture(): Promise<RankingLookupFixture> {
  await removeLeftovers();
  const tag = `${TAG_PREFIX}${Date.now()}`;

  const [systemA, systemB] = await Promise.all(
    ["A", "B"].map((name) =>
      RankingSystem.create(
        {
          name: `${tag} system ${name}`,
          amountOfLevels: 12,
          procentWinning: 75,
          procentLosing: 50,
          primary: false,
        },
        { hooks: false }
      )
    )
  );

  const [exact, twoSystems, noPlace, weeklyOnly] = await Promise.all(
    ["exact", "two-systems", "no-place", "weekly-only"].map((name) =>
      Player.create(
        {
          firstName: name,
          lastName: tag,
          memberId: `${tag}-${name}`,
          gender: "M",
          competitionPlayer: true,
        },
        { hooks: false }
      )
    )
  );

  const place = (
    player: Player,
    system: RankingSystem,
    date: string,
    single: number,
    update = true
  ) => ({
    playerId: player.id,
    systemId: system.id,
    rankingDate: stored(date),
    single,
    double: single,
    mix: single,
    updatePossible: update,
  });

  await RankingPlace.bulkCreate(
    [
      place(exact, systemA, "05-04", 10),
      place(exact, systemA, "05-25", 9, false),
      place(exact, systemA, "06-01", 8),
      place(exact, systemA, "06-08", 7, false),
      place(exact, systemA, "06-10", 6),
      place(exact, systemA, "06-15", 5),
      place(twoSystems, systemA, "06-01", 8),
      place(twoSystems, systemB, "06-05", 3),
      place(noPlace, systemA, "06-15", 5),
      place(weeklyOnly, systemA, "06-08", 7, false),
    ],
    { hooks: false }
  );

  const team = await Team.create(
    {
      name: `${tag} team`,
      season: RANKING_LOOKUP_SEASON,
      type: SubEventTypeEnum.M,
      teamNumber: 1,
    },
    { hooks: false }
  );

  await TeamPlayerMembership.bulkCreate(
    [exact, twoSystems, noPlace, weeklyOnly].map((p) => ({
      teamId: team.id,
      playerId: p.id,
      membershipType: TeamMembershipType.REGULAR,
      start: stored("07-01"),
    })),
    { hooks: false }
  );

  const playerIds = [exact, twoSystems, noPlace, weeklyOnly].map((p) => p.id);

  const cleanup = async () => {
    await RankingPlace.destroy({ where: { playerId: playerIds }, hooks: false });
    await TeamPlayerMembership.destroy({ where: { teamId: team.id }, hooks: false });
    await Team.destroy({ where: { id: team.id }, hooks: false });
    await Player.destroy({ where: { id: playerIds }, hooks: false });
    await RankingSystem.destroy({ where: { id: [systemA.id, systemB.id] }, hooks: false });
  };

  return { systemA, systemB, exact, twoSystems, noPlace, weeklyOnly, team, cleanup };
}
