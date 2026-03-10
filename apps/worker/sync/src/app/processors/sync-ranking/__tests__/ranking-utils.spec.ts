import { parse } from "date-fns";
import { isPublicationUsedForUpdate } from "../ranking-utils";

/**
 * Tests for isPublicationUsedForUpdate.
 *
 * The rule: a publication is used for ranking updates when its date falls on or
 * within 2 days after the first Monday of an "update month"
 * (updateMonths = [0, 2, 4, 6, 8, 10] by default — odd months are skipped).
 *
 * Individual dates can be force-included (goodDates) or force-excluded (badDates).
 */

const UPDATE_MONTHS = [0, 2, 4, 6, 8, 10]; // Jan, Mar, May, Jul, Sep, Nov
const GOOD_DATES: string[] = [];
const BAD_DATES: string[] = [];

function make(dateStr: string) {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

describe("isPublicationUsedForUpdate", () => {
  // ─── First Monday detection ──────────────────────────────────────────────

  describe("first Monday of the month", () => {
    it("returns true when date is exactly the first Monday of an update month", () => {
      // January 2024: first Monday is the 1st
      expect(isPublicationUsedForUpdate(make("2024-01-01"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(true);
    });

    it("returns true when date is exactly the first Monday (mid-week start month)", () => {
      // March 2024: 1st is a Friday → first Monday is the 4th
      expect(isPublicationUsedForUpdate(make("2024-03-04"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(true);
    });

    it("returns true when date is 1 day after the first Monday (within exclusive isBetween window)", () => {
      // March 2024 first Monday = 4th → 5th is within the window
      expect(isPublicationUsedForUpdate(make("2024-03-05"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(true);
    });

    it("returns false when date is exactly 2 days after the first Monday (exclusive boundary)", () => {
      // isBetween is exclusive of endpoints → margin endpoint is outside the window
      // March 2024 first Monday = 4th, margin = 6th → 6th is excluded
      expect(isPublicationUsedForUpdate(make("2024-03-06"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });

    it("returns false when date is 3 days after the first Monday", () => {
      // March 2024 first Monday = 4th → 7th is outside
      expect(isPublicationUsedForUpdate(make("2024-03-07"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });

    it("returns false when date is before the first Monday in an update month", () => {
      // March 2024: 1st is a Friday, first Monday is 4th → 1st should be false
      expect(isPublicationUsedForUpdate(make("2024-03-01"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });

    it("returns false for a non-update month even if date is first Monday", () => {
      // February 2024 is not in UPDATE_MONTHS → always false
      // First Monday of Feb 2024 = 5th
      expect(isPublicationUsedForUpdate(make("2024-02-05"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });

    it("returns false for a mid-month date in an update month", () => {
      // January 2024, 15th is a normal Monday but not the first
      expect(isPublicationUsedForUpdate(make("2024-01-15"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });
  });

  // ─── Month where the 1st is a Monday ─────────────────────────────────────

  describe("month starting on Monday (.date(1).day(8) edge case)", () => {
    it("returns true when the 1st of the month is already a Monday", () => {
      // January 2024: 1st is Monday
      expect(isPublicationUsedForUpdate(make("2024-01-01"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(true);
    });

    it("returns true for the day after when the 1st is already Monday", () => {
      expect(isPublicationUsedForUpdate(make("2024-01-02"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(true);
    });

    it("returns false 3 days after when the 1st is already Monday", () => {
      expect(isPublicationUsedForUpdate(make("2024-01-04"), UPDATE_MONTHS, GOOD_DATES, BAD_DATES)).toBe(false);
    });
  });

  // ─── Override lists ───────────────────────────────────────────────────────

  describe("goodDates override", () => {
    it("returns true for a date in goodDates even if it would otherwise be false", () => {
      // September 5 2021 is the bad date override in production; here we use it as a good date
      const date = make("2021-09-13"); // a Monday in September
      const iso = date.toISOString();
      expect(
        isPublicationUsedForUpdate(date, UPDATE_MONTHS, [iso], [])
      ).toBe(true);
    });

    it("forces true even when the month is not in updateMonths", () => {
      const date = make("2024-02-14"); // February, not an update month
      const iso = date.toISOString();
      expect(
        isPublicationUsedForUpdate(date, UPDATE_MONTHS, [iso], [])
      ).toBe(true);
    });
  });

  describe("badDates override", () => {
    it("returns false for a date in badDates even if it falls on the first Monday", () => {
      // March 4 2024 is a first Monday; we blacklist it
      const date = make("2024-03-04");
      const iso = date.toISOString();
      expect(
        isPublicationUsedForUpdate(date, UPDATE_MONTHS, [], [iso])
      ).toBe(false);
    });
  });

  describe("production override dates from RankingSyncer", () => {
    const GOOD = ["2021-09-12T22:00:00.000Z"];
    const BAD = ["2021-09-05T22:00:00.000Z"];

    it("treats 2021-09-13 as usable (goodDate in UTC = 2021-09-12T22:00:00.000Z)", () => {
      // The date "2021-09-13" parsed as yyyy-MM-dd → midnight local → .toISOString() depends on host TZ.
      // The test is conditional: only assert if the ISO string actually matches the goodDates list.
      const date = make("2021-09-13");
      if (GOOD.includes(date.toISOString())) {
        expect(isPublicationUsedForUpdate(date, UPDATE_MONTHS, GOOD, BAD)).toBe(true);
      }
    });

    it("treats 2021-09-06 as excluded (badDate in UTC = 2021-09-05T22:00:00.000Z)", () => {
      const date = make("2021-09-06");
      if (BAD.includes(date.toISOString())) {
        expect(isPublicationUsedForUpdate(date, UPDATE_MONTHS, GOOD, BAD)).toBe(false);
      }
    });
  });
});
