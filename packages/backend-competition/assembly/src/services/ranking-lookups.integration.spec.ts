import {
  Player,
  RANKING_LOOKUP_SEASON,
  RankingLookupFixture,
  RankingSystem,
  Team,
  connectRankingLookupDb,
  createRankingLookupFixture,
} from "@badman/backend-database";
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { CalendarRange, lineUpRankingWindow } from "@badman/utils";
import { Sequelize } from "sequelize-typescript";
import { AssemblyExportService } from "./export/export.service";
import { AssemblyValidationService } from "./validate/assembly.service";

/**
 * Integration test (BAD-409): pins which ranking place the line-up export and
 * the line-up check use today, against the dev Postgres.
 * - Export: newest update publication of the system at or before 10 June.
 * - Check: newest update publication of the system within the month set on
 *   the event (in practice May of the season year).
 *
 * Opt-in: RUN_INTEGRATION_TESTS=1 with the docker dev database running.
 */
const findRepoRoot = (dir: string): string =>
  existsSync(join(dir, "pnpm-workspace.yaml")) ? dir : findRepoRoot(dirname(dir));
config({ path: join(findRepoRoot(__dirname), ".env") });

const sequelize: Sequelize | null = connectRankingLookupDb();
const describeOrSkip = sequelize ? describe : describe.skip;

describeOrSkip("line-up ranking lookups (integration)", () => {
  let fixture: RankingLookupFixture;

  beforeAll(async () => {
    fixture = await createRankingLookupFixture();
  }, 30000);

  afterAll(async () => {
    await fixture?.cleanup();
    await sequelize?.close();
  });

  describe("line-up export (AssemblyExportService)", () => {
    let singles: Map<string, number | undefined>;

    const exportFor = async (system: RankingSystem) => {
      const service = new AssemblyExportService();
      service.system = system;
      const team = await Team.findByPk(fixture.team.id);
      const players = await (
        service as unknown as {
          _getPlayers: (teams: Team[], season: number) => Promise<Player[]>;
        }
      )._getPlayers([team as Team], RANKING_LOOKUP_SEASON);
      return new Map(players.map((p) => [p.id, p.rankingPlaces?.[0]?.single]));
    };

    beforeAll(async () => {
      singles = await exportFor(fixture.systemA);
    });

    it("includes an update publication dated exactly on 10 June 00:00", () => {
      expect(singles.get(fixture.exact.id)).toBe(6);
    });

    it("uses only the given ranking system", async () => {
      expect(singles.get(fixture.twoSystems.id)).toBe(8);
      expect((await exportFor(fixture.systemB)).get(fixture.twoSystems.id)).toBe(3);
    });

    it("ignores weekly (non-update) publications", () => {
      expect(singles.get(fixture.weeklyOnly.id)).toBeUndefined();
    });

    it("returns no place when the player has none before the cutoff", () => {
      expect(singles.get(fixture.noPlace.id)).toBeUndefined();
    });
  });

  describe("line-up check (AssemblyValidationService)", () => {
    // The window fetchData derives from usedRankingUnit "months" / amount 4: May.
    const window = lineUpRankingWindow({
      season: RANKING_LOOKUP_SEASON,
      usedRankingUnit: "months",
      usedRankingAmount: 4,
    });

    const checkFor = async (system: RankingSystem, playerIds: string[]) => {
      const service = new AssemblyValidationService();
      const players = await (
        service as unknown as {
          batchFetchPlayersWithCache: (
            ids: string[],
            system: RankingSystem,
            window: CalendarRange
          ) => Promise<Player[]>;
        }
      ).batchFetchPlayersWithCache(playerIds, system, window);
      return new Map(players.map((p) => [p.id, p.rankingPlaces?.[0]?.single]));
    };

    it("uses the newest update publication in May, not the June ones", async () => {
      const singles = await checkFor(fixture.systemA, [fixture.exact.id]);
      expect(singles.get(fixture.exact.id)).toBe(10);
    });

    it("returns no place for players without an update publication in May", async () => {
      const singles = await checkFor(fixture.systemA, [
        fixture.twoSystems.id,
        fixture.weeklyOnly.id,
        fixture.noPlace.id,
      ]);
      expect(singles.get(fixture.twoSystems.id)).toBeUndefined();
      expect(singles.get(fixture.weeklyOnly.id)).toBeUndefined();
      expect(singles.get(fixture.noPlace.id)).toBeUndefined();
    });
  });
});
