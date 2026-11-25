import moment from "moment";
import { alsoRunInTimezone } from "../../../../../jest.also-run-in-timezone";
import { enrollmentRankingDate, lineUpRankingWindow } from "./ranking-dates";

// Runs in Europe/Brussels (the default) and again in UTC: every result must be the same.
describe(`ranking reference dates (process TZ ${process.env["TZ"]})`, () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("enrollmentRankingDate (latest place up to 10 June)", () => {
    it("returns 10 June of the season", () => {
      expect(enrollmentRankingDate(2026)).toBe("2026-06-10");
      expect(enrollmentRankingDate(2024)).toBe("2024-06-10");
    });

    it("throws for an invalid season", () => {
      expect(() => enrollmentRankingDate(2026.5)).toThrow(RangeError);
    });
  });

  describe("lineUpRankingWindow (calendar month from the event's line-up setting)", () => {
    it.each([
      [1, { from: "2026-02-01", to: "2026-02-28" }],
      [4, { from: "2026-05-01", to: "2026-05-31" }],
      [11, { from: "2026-12-01", to: "2026-12-31" }],
    ])("months / %i of season 2026", (amount, expected) => {
      expect(
        lineUpRankingWindow({ season: 2026, usedRankingUnit: "months", usedRankingAmount: amount })
      ).toEqual(expected);
    });

    it("handles February of a leap year", () => {
      expect(
        lineUpRankingWindow({ season: 2028, usedRankingUnit: "months", usedRankingAmount: 1 })
      ).toEqual({
        from: "2028-02-01",
        to: "2028-02-29",
      });
    });

    it("rolls over into the next year like moment does", () => {
      expect(
        lineUpRankingWindow({ season: 2026, usedRankingUnit: "months", usedRankingAmount: 12 })
      ).toEqual({
        from: "2027-01-01",
        to: "2027-01-31",
      });
    });

    it("gives the same months window whatever day it is today", () => {
      const event = { season: 2026, usedRankingUnit: "months" as const, usedRankingAmount: 4 };
      const expected = { from: "2026-05-01", to: "2026-05-31" };

      jest.useFakeTimers().setSystemTime(new Date("2027-01-31T23:00:00.000Z"));
      expect(lineUpRankingWindow(event)).toEqual(expected);

      jest.setSystemTime(new Date("2028-02-29T12:00:00.000Z"));
      expect(lineUpRankingWindow(event)).toEqual(expected);
    });

    it("keeps the current computation for weeks: the month of that week number in the season year", () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
      expect(
        lineUpRankingWindow({ season: 2026, usedRankingUnit: "weeks", usedRankingAmount: 20 })
      ).toEqual({
        from: "2026-05-01",
        to: "2026-05-31",
      });
    });

    it("keeps the current computation for days: moment sets the weekday, so today's month", () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
      expect(
        lineUpRankingWindow({ season: 2026, usedRankingUnit: "days", usedRankingAmount: 3 })
      ).toEqual({
        from: "2026-10-01",
        to: "2026-10-31",
      });
    });

    it("gives the same weeks and days windows as moment's set() did, on any day", () => {
      // moment is only the reference here: the original code was
      // moment().set("year", season).set(unit, amount), then that month.
      const viaMoment = (season: number, unit: "weeks" | "days", amount: number) => {
        const date = moment().set("year", season).set(unit, amount);
        return {
          from: moment(date).startOf("month").format("YYYY-MM-DD"),
          to: moment(date).endOf("month").format("YYYY-MM-DD"),
        };
      };

      jest.useFakeTimers();
      const differences: string[] = [];
      for (let day = 0; day < 2 * 366; day += 3) {
        const today = new Date(Date.UTC(2026, 0, 1, 12) + day * 86_400_000);
        jest.setSystemTime(today);
        const cases: ["weeks" | "days", number][] = [
          ...Array.from({ length: 53 }, (_, i) => ["weeks", i + 1] as ["weeks", number]),
          ...Array.from({ length: 10 }, (_, i) => ["days", i + 1] as ["days", number]),
        ];
        for (const season of [2026, 2028]) {
          for (const [unit, amount] of cases) {
            const actual = lineUpRankingWindow({
              season,
              usedRankingUnit: unit,
              usedRankingAmount: amount,
            });
            const expected = viaMoment(season, unit, amount);
            if (actual.from !== expected.from || actual.to !== expected.to) {
              differences.push(`${today.toISOString()} ${season} ${unit}/${amount}`);
            }
          }
        }
      }
      expect(differences).toEqual([]);
    });

    it.each([
      [{ season: 2026 }],
      [{ season: 2026, usedRankingUnit: "months" as const }],
      [{ season: 2026, usedRankingAmount: 4 }],
      [{ season: 2026, usedRankingUnit: "months" as const, usedRankingAmount: 0 }],
    ])("throws when the setting is missing: %p", (event) => {
      expect(() => lineUpRankingWindow(event)).toThrow(
        "EventCompetition usedRankingUnit is not set"
      );
    });
  });
});

alsoRunInTimezone(__filename, "UTC");
