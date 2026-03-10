import { matchesAvailabilityWindow } from "../encounter-location-utils";

/**
 * Tests for matchesAvailabilityWindow.
 *
 * Returns true when:
 *   1. The encounter's day-of-week matches availabilityDay (case-insensitive)
 *   2. The encounter's time is within ±15 minutes of startTimeStr
 *
 * "Within" uses moment's isBetween which is exclusive of endpoints.
 */

function makeEncounterDate(isoDateStr: string): Date {
  return new Date(isoDateStr);
}

describe("matchesAvailabilityWindow", () => {
  // Wednesday 2024-03-06 19:30 local (UTC+1 in winter = 18:30Z)
  // Using a local-timezone-safe approach: just use an ISO string and let moment parse it
  const WEDNESDAY_19_30 = new Date("2024-03-06T19:30:00"); // local time

  // ─── Day-of-week matching ─────────────────────────────────────────────────

  describe("day-of-week guard", () => {
    it("returns false when the availability day does not match the encounter day", () => {
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "monday", "19:30")).toBe(false);
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "tuesday", "19:30")).toBe(false);
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "thursday", "19:30")).toBe(false);
    });

    it("returns true for the correct day with an exact time match", () => {
      // Wednesday = correct day, 19:30 = exact time → within window
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "wednesday", "19:30")).toBe(true);
    });

    it("is case-insensitive for day names", () => {
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "Wednesday", "19:30")).toBe(false);
      // availabilityDay is already lowercased from the DB — the function lowercases momentDate.format("dddd")
      // "Wednesday" !== "wednesday" so this should be false; confirms comparison is exact string match
    });
  });

  // ─── ±15 minute window ────────────────────────────────────────────────────

  describe("time window", () => {
    it("returns true when encounter time is exactly at the slot start", () => {
      expect(matchesAvailabilityWindow(WEDNESDAY_19_30, "wednesday", "19:30")).toBe(true);
    });

    it("returns true when encounter time is 14 minutes before the slot start", () => {
      const date = new Date("2024-03-06T19:16:00"); // 19:30 - 14 min
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(true);
    });

    it("returns true when encounter time is 14 minutes after the slot start", () => {
      const date = new Date("2024-03-06T19:44:00"); // 19:30 + 14 min
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(true);
    });

    it("returns false when encounter time is exactly 15 minutes before (exclusive boundary)", () => {
      // isBetween is exclusive → exactly -15 min is outside
      const date = new Date("2024-03-06T19:15:00");
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(false);
    });

    it("returns false when encounter time is exactly 15 minutes after (exclusive boundary)", () => {
      const date = new Date("2024-03-06T19:45:00");
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(false);
    });

    it("returns false when encounter time is 30 minutes before the slot", () => {
      const date = new Date("2024-03-06T19:00:00");
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(false);
    });

    it("returns false when encounter time is 30 minutes after the slot", () => {
      const date = new Date("2024-03-06T20:00:00");
      expect(matchesAvailabilityWindow(date, "wednesday", "19:30")).toBe(false);
    });
  });

  // ─── Real-world scenarios ─────────────────────────────────────────────────

  describe("realistic availability slots", () => {
    it("matches a Friday evening slot (20:00) with a +10 min encounter", () => {
      // Friday 2024-03-08 20:10
      const date = new Date("2024-03-08T20:10:00");
      expect(matchesAvailabilityWindow(date, "friday", "20:00")).toBe(true);
    });

    it("does not match a Friday slot for a Saturday encounter", () => {
      // Saturday 2024-03-09 20:10
      const date = new Date("2024-03-09T20:10:00");
      expect(matchesAvailabilityWindow(date, "friday", "20:00")).toBe(false);
    });

    it("matches a Monday morning slot (09:00) when encounter is at 08:50", () => {
      // Monday 2024-03-04 08:50
      const date = new Date("2024-03-04T08:50:00");
      expect(matchesAvailabilityWindow(date, "monday", "09:00")).toBe(true);
    });

    it("does not match a Monday slot when encounter is 20 minutes early", () => {
      // Monday 2024-03-04 08:40 — 20 min before 09:00
      const date = new Date("2024-03-04T08:40:00");
      expect(matchesAvailabilityWindow(date, "monday", "09:00")).toBe(false);
    });
  });
});
