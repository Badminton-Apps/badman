import { RankingSystem, Team } from "@badman/backend-database";
import { Op } from "sequelize";
import { AssemblyExportService } from "./export.service";

/**
 * Characterization tests (BAD-409) for the ranking date of the line-up export.
 * They pin today's query so the S3 groundwork (BAD-392) can prove it changes
 * nothing by accident. Tests run with TZ=Europe/Brussels, as production does
 * (jest.global-setup.js), so 10 June 00:00 is 9 June 22:00 UTC.
 */
describe("AssemblyExportService ranking date (characterization)", () => {
  type Include = {
    where: {
      systemId?: string;
      rankingDate?: Record<symbol, Date>;
      updatePossible?: boolean;
    };
    limit?: number;
    order?: unknown;
  };

  const placeIncludeFor = async (season: number) => {
    const service = new AssemblyExportService();
    service.system = { id: "system-1" } as RankingSystem;
    const getPlayers = jest.fn().mockResolvedValue([]);

    await (
      service as unknown as { _getPlayers: (teams: Team[], season: number) => Promise<unknown> }
    )._getPlayers([{ getPlayers } as unknown as Team], season);

    const include = getPlayers.mock.calls[0][0].include as Include[];
    return include[1];
  };

  it("takes the newest update publication up to and including 10 June of the season", async () => {
    const include = await placeIncludeFor(2026);

    expect(include.where.systemId).toBe("system-1");
    expect(include.where.updatePossible).toBe(true);
    expect(include.where.rankingDate?.[Op.lte].toISOString()).toBe("2026-06-09T22:00:00.000Z");
    expect(include.limit).toBe(1);
    expect(include.order).toEqual([["rankingDate", "DESC"]]);
  });

  it("uses 10 June of the given season, not of the current year", async () => {
    const include = await placeIncludeFor(2024);
    expect(include.where.rankingDate?.[Op.lte].toISOString()).toBe("2024-06-09T22:00:00.000Z");
  });
});
