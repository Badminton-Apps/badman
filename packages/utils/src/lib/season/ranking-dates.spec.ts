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

    it.each(["weeks", "days"] as const)("rejects the unused unit %s (research R7)", (unit) => {
      expect(() =>
        lineUpRankingWindow({ season: 2026, usedRankingUnit: unit, usedRankingAmount: 4 })
      ).toThrow(`EventCompetition usedRankingUnit "${unit}" is not supported, use "months"`);
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
