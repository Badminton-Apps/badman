import { formatEncounterDateForApi } from "../change-date-utils";

/**
 * Tests for formatEncounterDateForApi.
 *
 * This value goes directly into XML sent to the Visual Reality API.
 * A wrong timezone offset means the API stores the wrong match time — silent data corruption.
 *
 * Belgium (Europe/Brussels) observes:
 *   - CET  (UTC+1) from last Sunday of October  → last Sunday of March
 *   - CEST (UTC+2) from last Sunday of March    → last Sunday of October
 */
describe("formatEncounterDateForApi", () => {
  // ─── Format shape ─────────────────────────────────────────────────────────

  describe("output format", () => {
    it("returns a string matching YYYY-MM-DDTHH:mm:ss with no timezone suffix", () => {
      const date = new Date("2024-03-06T18:30:00Z");
      const result = formatEncounterDateForApi(date, "Europe/Brussels");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("uses the provided format string when supplied", () => {
      const date = new Date("2024-03-06T18:30:00Z");
      const result = formatEncounterDateForApi(date, "Europe/Brussels", "YYYY-MM-DD");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ─── Winter time (CET = UTC+1) ────────────────────────────────────────────

  describe("CET — winter time (UTC+1)", () => {
    it("adds 1 hour to a UTC timestamp in January", () => {
      // 2024-01-15 19:00 UTC → 2024-01-15T20:00:00 Brussels
      const date = new Date("2024-01-15T19:00:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-01-15T20:00:00");
    });

    it("adds 1 hour in December", () => {
      // 2024-12-04 18:30 UTC → 2024-12-04T19:30:00 Brussels
      const date = new Date("2024-12-04T18:30:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-12-04T19:30:00");
    });

    it("correctly wraps midnight when UTC is 23:30 the previous day", () => {
      // 2024-02-20 23:30 UTC → 2024-02-21T00:30:00 Brussels
      const date = new Date("2024-02-20T23:30:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-02-21T00:30:00");
    });
  });

  // ─── Summer time (CEST = UTC+2) ───────────────────────────────────────────

  describe("CEST — summer time (UTC+2)", () => {
    it("adds 2 hours to a UTC timestamp in July", () => {
      // 2024-07-10 17:00 UTC → 2024-07-10T19:00:00 Brussels
      const date = new Date("2024-07-10T17:00:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-07-10T19:00:00");
    });

    it("adds 2 hours in September", () => {
      // 2024-09-18 17:30 UTC → 2024-09-18T19:30:00 Brussels
      const date = new Date("2024-09-18T17:30:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-09-18T19:30:00");
    });
  });

  // ─── DST boundary ─────────────────────────────────────────────────────────

  describe("DST transitions", () => {
    it("uses UTC+1 one hour before the spring-forward (last Sunday March 2024 = 31st, 01:00 UTC)", () => {
      // 2024-03-31 00:59:59 UTC → still CET (UTC+1) → 01:59:59 Brussels
      const date = new Date("2024-03-31T00:59:59Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-03-31T01:59:59");
    });

    it("uses UTC+2 one second after the spring-forward", () => {
      // 2024-03-31 01:00:01 UTC → now CEST (UTC+2) → 03:00:01 Brussels (clocks jump from 02:00 to 03:00)
      const date = new Date("2024-03-31T01:00:01Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-03-31T03:00:01");
    });

    it("uses UTC+2 one hour before the autumn fall-back (last Sunday Oct 2024 = 27th, 01:00 UTC)", () => {
      // 2024-10-27 00:59:59 UTC → still CEST (UTC+2) → 02:59:59 Brussels
      const date = new Date("2024-10-27T00:59:59Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-10-27T02:59:59");
    });

    it("uses UTC+1 one second after the autumn fall-back", () => {
      // 2024-10-27 01:00:01 UTC → now CET (UTC+1) → 02:00:01 Brussels
      const date = new Date("2024-10-27T01:00:01Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-10-27T02:00:01");
    });
  });

  // ─── Typical match scheduling times ──────────────────────────────────────

  describe("realistic match times", () => {
    it("formats a typical weekday evening match in winter", () => {
      // Wednesday 2024-11-06 19:30 Brussels = 18:30 UTC
      const date = new Date("2024-11-06T18:30:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-11-06T19:30:00");
    });

    it("formats a typical weekend morning match in summer", () => {
      // Saturday 2024-06-15 10:00 Brussels = 08:00 UTC
      const date = new Date("2024-06-15T08:00:00Z");
      expect(formatEncounterDateForApi(date, "Europe/Brussels")).toBe("2024-06-15T10:00:00");
    });
  });
});
