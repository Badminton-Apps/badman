import {
  RANKING_LOOKUP_SEASON,
  RankingLookupFixture,
  connectRankingLookupDb,
  createRankingLookupFixture,
} from "@badman/backend-database";
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { Sequelize } from "sequelize-typescript";
import { IndexCalculationService } from "./index-calculation.service";

/**
 * Integration test (BAD-409): pins which ranking place the enrollment index
 * uses today, against the dev Postgres. Rule today: the newest place of the
 * given ranking system at or before 10 June of the season, any publication.
 *
 * Opt-in: RUN_INTEGRATION_TESTS=1 with the docker dev database running.
 */
const findRepoRoot = (dir: string): string =>
  existsSync(join(dir, "pnpm-workspace.yaml")) ? dir : findRepoRoot(dirname(dir));
config({ path: join(findRepoRoot(__dirname), ".env") });

const sequelize: Sequelize | null = connectRankingLookupDb();
const describeOrSkip = sequelize ? describe : describe.skip;

describeOrSkip("IndexCalculationService ranking lookup (integration)", () => {
  let fixture: RankingLookupFixture;
  let singleFor: (playerId: string, systemId: string) => Promise<number | undefined>;

  beforeAll(async () => {
    fixture = await createRankingLookupFixture();
    const service = new IndexCalculationService();
    const fetchPlaceMap = (
      service as unknown as {
        fetchPlaceMap: (
          ids: string[],
          systemId: string,
          season: number
        ) => Promise<Map<string, { single: number }>>;
      }
    ).fetchPlaceMap.bind(service);

    singleFor = async (playerId, systemId) =>
      (await fetchPlaceMap([playerId], systemId, RANKING_LOOKUP_SEASON)).get(playerId)?.single;
  }, 30000);

  afterAll(async () => {
    await fixture?.cleanup();
    await sequelize?.close();
  });

  it("includes a place dated exactly on 10 June 00:00", async () => {
    expect(await singleFor(fixture.exact.id, fixture.systemA.id)).toBe(6);
  });

  it("uses only the given ranking system", async () => {
    expect(await singleFor(fixture.twoSystems.id, fixture.systemA.id)).toBe(8);
    expect(await singleFor(fixture.twoSystems.id, fixture.systemB.id)).toBe(3);
  });

  it("counts weekly (non-update) publications", async () => {
    expect(await singleFor(fixture.weeklyOnly.id, fixture.systemA.id)).toBe(7);
  });

  it("returns no place when the player has none before the cutoff", async () => {
    expect(await singleFor(fixture.noPlace.id, fixture.systemA.id)).toBeUndefined();
  });
});
