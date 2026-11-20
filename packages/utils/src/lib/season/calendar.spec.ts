import { brusselsDayRange, storedInstant, toCalendarDate } from "./calendar";
import { rerunInBrussels } from "./rerun-in-brussels.spec-helper";

// Runs in UTC and again in Europe/Brussels: every result must be the same.
describe(`calendar helpers (process TZ ${process.env["TZ"]})`, () => {
  describe("toCalendarDate", () => {
    it.each([
      [
        "30 April 22:30 UTC is 1 May in Brussels (summer time)",
        "2027-04-30T22:30:00.000Z",
        "2027-05-01",
      ],
      ["30 June 21:59:59.999 UTC is still 30 June", "2026-06-30T21:59:59.999Z", "2026-06-30"],
      ["30 June 22:00 UTC is 1 July", "2026-06-30T22:00:00.000Z", "2026-07-01"],
      [
        "31 December 23:30 UTC is 1 January (winter time)",
        "2026-12-31T23:30:00.000Z",
        "2027-01-01",
      ],
      ["31 December 22:59 UTC is still 31 December", "2026-12-31T22:59:00.000Z", "2026-12-31"],
      ["leap day", "2028-02-29T12:00:00.000Z", "2028-02-29"],
      ["start of the day summer time begins", "2027-03-27T23:00:00.000Z", "2027-03-28"],
      ["start of the day winter time begins", "2027-10-30T22:00:00.000Z", "2027-10-31"],
    ])("%s", (_label, iso, expected) => {
      expect(toCalendarDate(new Date(iso))).toBe(expected);
    });

    it("uses another timezone when asked", () => {
      expect(toCalendarDate(new Date("2027-04-30T22:30:00.000Z"), "UTC")).toBe("2027-04-30");
      expect(toCalendarDate(new Date("2026-12-31T23:30:00.000Z"), "UTC")).toBe("2026-12-31");
    });

    it("throws for an invalid date", () => {
      expect(() => toCalendarDate(new Date("not a date"))).toThrow(RangeError);
    });
  });

  describe("storedInstant (midnight UTC of the date)", () => {
    it("returns midnight UTC", () => {
      expect(storedInstant("2026-07-01").toISOString()).toBe("2026-07-01T00:00:00.000Z");
      expect(storedInstant("2028-02-29").toISOString()).toBe("2028-02-29T00:00:00.000Z");
    });

    it.each(["2026-02-30", "2026-7-1", "2026-07-01T00:00:00Z", ""])("rejects %p", (value) => {
      expect(() => storedInstant(value)).toThrow(RangeError);
    });
  });

  describe("brusselsDayRange ([start of from, start of the day after to) in Brussels)", () => {
    const iso = (range: { start: Date; endExclusive: Date }) => ({
      start: range.start.toISOString(),
      endExclusive: range.endExclusive.toISOString(),
    });

    it("covers a summer month", () => {
      expect(iso(brusselsDayRange({ from: "2026-05-01", to: "2026-05-31" }))).toEqual({
        start: "2026-04-30T22:00:00.000Z",
        endExclusive: "2026-05-31T22:00:00.000Z",
      });
    });

    it("covers a winter month", () => {
      expect(iso(brusselsDayRange({ from: "2026-12-01", to: "2026-12-31" }))).toEqual({
        start: "2026-11-30T23:00:00.000Z",
        endExclusive: "2026-12-31T23:00:00.000Z",
      });
    });

    it("covers a month in which summer time begins", () => {
      expect(iso(brusselsDayRange({ from: "2027-03-01", to: "2027-03-31" }))).toEqual({
        start: "2027-02-28T23:00:00.000Z",
        endExclusive: "2027-03-31T22:00:00.000Z",
      });
    });

    it("covers a single day", () => {
      expect(iso(brusselsDayRange({ from: "2026-06-10", to: "2026-06-10" }))).toEqual({
        start: "2026-06-09T22:00:00.000Z",
        endExclusive: "2026-06-10T22:00:00.000Z",
      });
    });

    it("matches a row stored at midnight UTC and at midnight Brussels, but not the next day", () => {
      const { start, endExclusive } = brusselsDayRange({ from: "2026-06-10", to: "2026-06-10" });
      const inRange = (iso: string) => {
        const at = new Date(iso);
        return at >= start && at < endExclusive;
      };

      expect(inRange("2026-06-10T00:00:00.000Z")).toBe(true);
      expect(inRange("2026-06-09T22:00:00.000Z")).toBe(true);
      expect(inRange("2026-06-11T00:00:00.000Z")).toBe(false);
      expect(inRange("2026-06-09T00:00:00.000Z")).toBe(false);
    });

    it("throws when from is after to", () => {
      expect(() => brusselsDayRange({ from: "2026-06-11", to: "2026-06-10" })).toThrow(RangeError);
    });

    it("throws for an invalid date", () => {
      expect(() => brusselsDayRange({ from: "2026-06-31", to: "2026-07-01" })).toThrow(RangeError);
    });
  });
});

rerunInBrussels(__filename);
