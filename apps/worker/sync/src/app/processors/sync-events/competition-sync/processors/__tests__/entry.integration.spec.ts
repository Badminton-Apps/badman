import {
  RANKING_LOOKUP_SEASON,
  RankingLookupFixture,
  RankingSystem,
  connectRankingLookupDb,
  createRankingLookupFixture,
} from "@badman/backend-database";
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { Sequelize } from "sequelize-typescript";
import { CompetitionSyncEntryProcessor } from "../entry";

/**
 * Integration test (BAD-409): pins which ranking place the sync worker stores
 * as enrollment levels, against the dev Postgres. Rule: the newest place at or
 * before 10 June of the team's season, any publication, in the primary ranking
 * system (the system filter was added in BAD-392).
 *
 * The fixture's systems are not primary, so the dev database's real primary
 * system stays untouched; the test makes fixture system A the primary one by
 * stubbing that single lookup.
 *
 * Opt-in: RUN_INTEGRATION_TESTS=1 with the docker dev database running.
 */
const findRepoRoot = (dir: string): string =>
  existsSync(join(dir, "pnpm-workspace.yaml")) ? dir : findRepoRoot(dirname(dir));
config({ path: join(findRepoRoot(__dirname), ".env") });

const sequelize: Sequelize | null = connectRankingLookupDb();
const describeOrSkip = sequelize ? describe : describe.skip;

type StoredPlayer = { id?: string; single: number; double: number; mix: number };

describeOrSkip("CompetitionSyncEntryProcessor ranking lookup (integration)", () => {
  let fixture: RankingLookupFixture;
  let stored: Map<string | undefined, StoredPlayer>;

  beforeAll(async () => {
    fixture = await createRankingLookupFixture();
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(fixture.systemA);
    const players = [fixture.exact, fixture.twoSystems, fixture.noPlace, fixture.weeklyOnly];

    const visualService = {
      getDraw: jest.fn().mockResolvedValue({
        Structure: { Item: [{ Team: { Name: fixture.team.name, Code: "T-001" } }] },
      }),
      getTeam: jest.fn().mockResolvedValue({
        Players: { Player: players.map((p) => ({ MemberID: p.memberId, GenderID: 1 })) },
      }),
    };
    const processor = new CompetitionSyncEntryProcessor(
      { Code: "TOURN" } as never,
      visualService as never,
      { transaction: undefined }
    );

    const team = {
      id: fixture.team.id,
      name: fixture.team.name,
      season: RANKING_LOOKUP_SEASON,
      phone: null,
      email: null,
      save: jest.fn(),
    };
    const entry = { id: "entry-1", meta: null as unknown, save: jest.fn() };

    await (processor as unknown as Record<string, (...args: unknown[]) => Promise<void>>)[
      "_updateTeamDataFromVisual"
    ](team, entry, 1);

    expect(entry.save).toHaveBeenCalled();
    const meta = entry.meta as { competition: { players: StoredPlayer[] } };
    stored = new Map(meta.competition.players.map((p) => [p.id, p]));
  }, 30000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await fixture?.cleanup();
    await sequelize?.close();
  });

  it("includes a place dated exactly on 10 June 00:00", () => {
    expect(stored.get(fixture.exact.id)?.single).toBe(6);
  });

  it("takes the place of the primary ranking system, not a newer one of another system (BAD-392)", () => {
    expect(stored.get(fixture.twoSystems.id)?.single).toBe(8);
  });

  it("counts weekly (non-update) publications", () => {
    expect(stored.get(fixture.weeklyOnly.id)?.single).toBe(7);
  });

  it("falls back to 12 when the player has no place before the cutoff", () => {
    expect(stored.get(fixture.noPlace.id)).toMatchObject({ single: 12, double: 12, mix: 12 });
  });
});
