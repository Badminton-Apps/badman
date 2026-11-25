import { execFileSync } from "child_process";
import moment from "moment";
import { endOfSeason, getNextSeason, getSeason, getSeasonPeriod, startOfSeason } from "./comp";

/**
 * Characterization tests (BAD-409): they pin what the season helpers do today,
 * so the S3 groundwork (BAD-390/391) can prove it changes nothing by accident.
 *
 * The helpers read the server's local calendar. Production presumably runs in
 * UTC and developers in Europe/Brussels, so this suite runs in UTC (pinned by
 * jest.global-setup.js) and re-runs itself once in Europe/Brussels.
 */
const tz = process.env["TZ"];
const BRUSSELS_RERUN = "BADMAN_COMP_SPEC_BRUSSELS";

if (tz !== "UTC" && tz !== "Europe/Brussels") {
  throw new Error(`comp.spec.ts expects TZ=UTC or TZ=Europe/Brussels, got ${tz}`);
}

/** Local wall-clock time in the process timezone. */
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m - 1, d, h, min, s, ms);

describe(`season helpers in ${tz}`, () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getSeason (switches on 1 May, local time)", () => {
    it.each([
      ["30 April 23:59:59.999", local(2027, 4, 30, 23, 59, 59, 999), 2026],
      ["1 May 00:00", local(2027, 5, 1), 2027],
      ["31 December", local(2026, 12, 31, 23, 59), 2026],
      ["1 January", local(2027, 1, 1), 2026],
      ["31 August", local(2026, 8, 31), 2026],
      ["1 September", local(2026, 9, 1), 2026],
      ["29 February (leap year)", local(2028, 2, 29), 2027],
    ])("%s", (_label, date, expected) => {
      expect(getSeason(date)).toBe(expected);
    });

    it("accepts a moment", () => {
      expect(getSeason(moment(local(2027, 5, 1)))).toBe(2027);
    });

    it("uses the current date without input", () => {
      jest.useFakeTimers().setSystemTime(local(2027, 4, 30, 12));
      expect(getSeason()).toBe(2026);

      jest.setSystemTime(local(2027, 5, 1, 12));
      expect(getSeason()).toBe(2027);
    });

    it("falls back to the current date for an invalid date", () => {
      jest.useFakeTimers().setSystemTime(local(2027, 5, 1, 12));
      expect(getSeason(new Date("not a date"))).toBe(2027);
    });

    it("depends on the server timezone for the same instant", () => {
      // 30 April 22:30 UTC is already 1 May 00:30 in Brussels.
      const instant = new Date("2027-04-30T22:30:00.000Z");
      expect(getSeason(instant)).toBe(tz === "UTC" ? 2026 : 2027);
    });
  });

  describe("getSeasonPeriod (competition window 1 September – 30 April)", () => {
    it("returns the window of the given season as date strings", () => {
      expect(getSeasonPeriod(2026)).toEqual(["2026-09-01", "2027-04-30"]);
    });

    it("uses the current season without input", () => {
      jest.useFakeTimers().setSystemTime(local(2027, 2, 10, 12));
      expect(getSeasonPeriod()).toEqual(["2026-09-01", "2027-04-30"]);
    });

    it("treats season 0 as missing and uses the current season", () => {
      jest.useFakeTimers().setSystemTime(local(2027, 5, 1, 12));
      expect(getSeasonPeriod(0)).toEqual(["2027-09-01", "2028-04-30"]);
    });
  });

  describe("getNextSeason (switches on 1 October, local time)", () => {
    it.each([
      ["30 September 23:59:59.999", local(2026, 9, 30, 23, 59, 59, 999), 2026],
      ["1 October 00:00", local(2026, 10, 1), 2027],
      ["31 December", local(2026, 12, 31), 2027],
      ["1 January", local(2027, 1, 1), 2027],
      ["1 May", local(2027, 5, 1), 2027],
    ])("%s", (_label, date, expected) => {
      expect(getNextSeason(date)).toBe(expected);
    });

    it("uses the current date without input", () => {
      jest.useFakeTimers().setSystemTime(local(2026, 10, 1, 12));
      expect(getNextSeason()).toBe(2027);
    });

    it("falls back to the current date for an invalid date", () => {
      jest.useFakeTimers().setSystemTime(local(2026, 9, 30, 12));
      expect(getNextSeason(new Date("not a date"))).toBe(2026);
    });
  });

  describe("startOfSeason / endOfSeason (membership window 1 July – 30 June)", () => {
    it("starts at 1 July 00:00 local time", () => {
      expect(startOfSeason(2026).format("YYYY-MM-DDTHH:mm:ss.SSS")).toBe("2026-07-01T00:00:00.000");
    });

    it("ends at 30 June 23:59:59.999 local time of the next year", () => {
      expect(endOfSeason(2026).format("YYYY-MM-DDTHH:mm:ss.SSS")).toBe("2027-06-30T23:59:59.999");
    });

    it("gives timezone-dependent instants when sent to the database", () => {
      expect(startOfSeason(2026).toISOString()).toBe(
        tz === "UTC" ? "2026-07-01T00:00:00.000Z" : "2026-06-30T22:00:00.000Z"
      );
      expect(endOfSeason(2026).toISOString()).toBe(
        tz === "UTC" ? "2027-06-30T23:59:59.999Z" : "2027-06-30T21:59:59.999Z"
      );
    });
  });
});

// Jest gives each test file a copy of process.env, so TZ cannot change inside
// this run. Re-run this file in a child jest process with TZ=Europe/Brussels.
if (tz === "UTC" && !process.env[BRUSSELS_RERUN]) {
  describe("season helpers in Europe/Brussels", () => {
    it("pass the same suite", () => {
      const jestBin = require.resolve("jest/bin/jest");
      try {
        execFileSync(
          process.execPath,
          [jestBin, "--runTestsByPath", __filename, "--coverage=false", "--ci"],
          {
            cwd: process.cwd(),
            env: { ...process.env, TZ: "Europe/Brussels", [BRUSSELS_RERUN]: "1" },
            stdio: "pipe",
          }
        );
      } catch (error) {
        const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
        throw new Error(`Europe/Brussels run failed:\n${stderr ?? ""}${stdout ?? ""}`);
      }
    });
  });
}
