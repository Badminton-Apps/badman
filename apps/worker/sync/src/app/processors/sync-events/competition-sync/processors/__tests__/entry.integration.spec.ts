import {
  RANKING_LOOKUP_SEASON,
  RankingLookupFixture,
  connectRankingLookupDb,
  createRankingLookupFixture,
} from "@badman/backend-database";
import { Sequelize } from "sequelize-typescript";
import { CompetitionSyncEntryProcessor } from "../entry";

/**
 * Integration test (BAD-409): pins which ranking place the sync worker stores
 * as enrollment levels today, against the dev Postgres. Rule today: the newest
 * place at or before 10 June of the team's season, any publication, without a
 * ranking-system filter (a bug that BAD-392 fixes).
 *
 * Opt-in: RUN_INTEGRATION_TESTS=1 with the docker dev database running.
 */
const sequelize: Sequelize | null = connectRankingLookupDb();
const describeOrSkip = sequelize ? describe : describe.skip;

type StoredPlayer = { id?: string; single: number; double: number; mix: number };

describeOrSkip("CompetitionSyncEntryProcessor ranking lookup (integration)", () => {
  let fixture: RankingLookupFixture;
  let stored: Map<string | undefined, StoredPlayer>;

  beforeAll(async () => {
    fixture = await createRankingLookupFixture();
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
    await fixture?.cleanup();
    await sequelize?.close();
  });

  it("includes a place dated exactly on 10 June 00:00", () => {
    expect(stored.get(fixture.exact.id)?.single).toBe(6);
  });

  it("current behaviour, fixed in BAD-392: takes the newest place of any ranking system", () => {
    expect(stored.get(fixture.twoSystems.id)?.single).toBe(3);
  });

  it("counts weekly (non-update) publications", () => {
    expect(stored.get(fixture.weeklyOnly.id)?.single).toBe(7);
  });

  it("falls back to 12 when the player has no place before the cutoff", () => {
    expect(stored.get(fixture.noPlace.id)).toMatchObject({ single: 12, double: 12, mix: 12 });
  });
});
