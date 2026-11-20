import { encounterRankingDate, enrollmentRankingDate, lineUpRankingWindow } from "./ranking-dates";
import { rerunInBrussels } from "./rerun-in-brussels.spec-helper";

// Runs in UTC and again in Europe/Brussels: every result must be the same.
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

  describe("encounterRankingDate (the Brussels date of the encounter)", () => {
    it("keeps a late evening encounter on its own day", () => {
      expect(encounterRankingDate(new Date("2027-01-31T23:30:00.000+01:00"))).toBe("2027-01-31");
    });

    it("uses the Brussels date when UTC is still on the previous day", () => {
      // 31 January 23:30 UTC is 1 February 00:30 in Brussels.
      expect(encounterRankingDate(new Date("2027-01-31T23:30:00.000Z"))).toBe("2027-02-01");
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

rerunInBrussels(__filename);
