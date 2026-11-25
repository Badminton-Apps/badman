import { CalendarDate, storedInstant } from "./calendar";
import { alsoRunInTimezone } from "../../../../../jest.also-run-in-timezone";
import {
  competitionSeasonWindow,
  enrollmentSeason,
  isInCompetitionSeason,
  isScoreEntrySeasonOpen,
  membershipCheckInstant,
  membershipPeriod,
  membershipWindow,
  nextSeason,
  oldestOpenScoreEntrySeason,
  seasonHalf,
  twizzitExportWindow,
} from "./season";

/** An instant written as Brussels wall-clock time with its UTC offset. */
const brussels = (localIso: string, offset: "+01:00" | "+02:00") =>
  new Date(`${localIso}${offset}`);

// Runs in Europe/Brussels (the default) and again in UTC: every result must be the same.
describe(`season module (process TZ ${process.env["TZ"]})`, () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("enrollmentSeason (switches on 1 May)", () => {
    it.each([
      ["30 April 23:59:59.999", brussels("2027-04-30T23:59:59.999", "+02:00"), 2026],
      ["1 May 00:00", brussels("2027-05-01T00:00:00.000", "+02:00"), 2027],
      ["31 December 23:59", brussels("2026-12-31T23:59:00.000", "+01:00"), 2026],
      ["1 January 00:00", brussels("2027-01-01T00:00:00.000", "+01:00"), 2026],
      ["1 September", brussels("2026-09-01T00:00:00.000", "+02:00"), 2026],
      ["29 February (leap year)", brussels("2028-02-29T12:00:00.000", "+01:00"), 2027],
    ])("%s (Brussels time)", (_label, at, expected) => {
      expect(enrollmentSeason(at)).toBe(expected);
    });

    it("uses the Brussels date of an instant, whatever the server timezone", () => {
      // 30 April 22:30 UTC is already 1 May 00:30 in Brussels.
      expect(enrollmentSeason(new Date("2027-04-30T22:30:00.000Z"))).toBe(2027);
    });

    it("uses another timezone when asked", () => {
      expect(enrollmentSeason(new Date("2027-04-30T22:30:00.000Z"), "UTC")).toBe(2026);
    });

    it("accepts a calendar date", () => {
      expect(enrollmentSeason("2027-04-30")).toBe(2026);
      expect(enrollmentSeason("2027-05-01")).toBe(2027);
    });

    it("uses the current moment without input", () => {
      jest.useFakeTimers().setSystemTime(new Date("2027-04-30T21:59:59.999Z"));
      expect(enrollmentSeason()).toBe(2026);

      jest.setSystemTime(new Date("2027-04-30T22:00:00.000Z"));
      expect(enrollmentSeason()).toBe(2027);
    });

    it("throws for an invalid date", () => {
      expect(() => enrollmentSeason(new Date("not a date"))).toThrow(RangeError);
      expect(() => enrollmentSeason("2027-02-30")).toThrow(RangeError);
    });
  });

  describe("competitionSeasonWindow (1 September – 30 April)", () => {
    it("returns the window of the season", () => {
      expect(competitionSeasonWindow(2026)).toEqual({ from: "2026-09-01", to: "2027-04-30" });
    });

    it.each([2026.5, Number.NaN])("throws for season %p", (season) => {
      expect(() => competitionSeasonWindow(season)).toThrow(RangeError);
    });
  });

  describe("isInCompetitionSeason (both ends included)", () => {
    it.each([
      ["31 August 23:59", brussels("2026-08-31T23:59:59.999", "+02:00"), false],
      ["1 September 00:00", brussels("2026-09-01T00:00:00.000", "+02:00"), true],
      ["31 December", brussels("2026-12-31T23:59:00.000", "+01:00"), true],
      ["1 January", brussels("2027-01-01T00:00:00.000", "+01:00"), true],
      ["30 April 23:59", brussels("2027-04-30T23:59:59.999", "+02:00"), true],
      ["1 May 00:00", brussels("2027-05-01T00:00:00.000", "+02:00"), false],
    ])("%s (Brussels time)", (_label, at, expected) => {
      expect(isInCompetitionSeason(at, 2026)).toBe(expected);
    });

    it("uses the Brussels date of an instant", () => {
      // 31 August 22:30 UTC is 1 September 00:30 in Brussels.
      expect(isInCompetitionSeason(new Date("2026-08-31T22:30:00.000Z"), 2026)).toBe(true);
      // 30 April 22:30 UTC is 1 May 00:30 in Brussels.
      expect(isInCompetitionSeason(new Date("2027-04-30T22:30:00.000Z"), 2026)).toBe(false);
    });

    it("accepts a calendar date", () => {
      expect(isInCompetitionSeason("2027-04-30", 2026)).toBe(true);
      expect(isInCompetitionSeason("2027-05-01", 2026)).toBe(false);
    });
  });

  describe("seasonHalf (calendar year = season → first, season + 1 → second)", () => {
    it.each([
      ["31 December 23:59", brussels("2026-12-31T23:59:59.999", "+01:00"), "first"],
      ["1 January 00:00", brussels("2027-01-01T00:00:00.000", "+01:00"), "second"],
      [
        "15 May of the next year (late encounters)",
        brussels("2027-05-15T20:00:00.000", "+02:00"),
        "second",
      ],
      ["15 August of the season year", brussels("2026-08-15T20:00:00.000", "+02:00"), "first"],
      ["1 September of the next year", brussels("2027-09-01T20:00:00.000", "+02:00"), "second"],
      ["1 January two years later", brussels("2028-01-01T00:00:00.000", "+01:00"), null],
      ["31 December of the year before", brussels("2025-12-31T20:00:00.000", "+01:00"), null],
    ])("%s (Brussels time)", (_label, at, expected) => {
      expect(seasonHalf(at, 2026)).toBe(expected);
    });

    it("uses the Brussels date of an instant", () => {
      // 31 December 23:30 UTC is 1 January 00:30 in Brussels.
      expect(seasonHalf(new Date("2026-12-31T23:30:00.000Z"), 2026)).toBe("second");
    });

    it("accepts a calendar date", () => {
      expect(seasonHalf("2026-12-31", 2026)).toBe("first");
      expect(seasonHalf("2027-01-01", 2026)).toBe("second");
    });
  });

  describe("membership (1 July – 30 June, stored as midnight in Brussels)", () => {
    it("names the calendar dates of the period", () => {
      expect(membershipPeriod(2026)).toEqual({ from: "2026-07-01", to: "2027-06-30" });
    });

    it("returns the stored window, end included", () => {
      const { start, end } = membershipWindow(2026);
      expect(start.toISOString()).toBe("2026-06-30T22:00:00.000Z");
      expect(end.toISOString()).toBe("2027-06-30T21:59:59.999Z");
    });

    it("checks membership at 1 July 00:00 Brussels time", () => {
      expect(membershipCheckInstant(2026).toISOString()).toBe("2026-06-30T22:00:00.000Z");
    });

    it("places 30 June in the previous season and 1 July in the new one", () => {
      const inWindow = (date: CalendarDate, season: number) => {
        const at = storedInstant(date);
        const { start, end } = membershipWindow(season);
        return at >= start && at <= end;
      };

      expect(inWindow("2027-06-30", 2026)).toBe(true);
      expect(inWindow("2027-06-30", 2027)).toBe(false);
      expect(inWindow("2027-07-01", 2026)).toBe(false);
      expect(inWindow("2027-07-01", 2027)).toBe(true);
    });
  });

  describe("score entry (season open until 1 July of the next year)", () => {
    it.each([
      ["30 June 23:59", brussels("2027-06-30T23:59:59.999", "+02:00"), true],
      ["1 July 00:00", brussels("2027-07-01T00:00:00.000", "+02:00"), false],
      ["during the competition", brussels("2027-02-10T12:00:00.000", "+01:00"), true],
    ])("isScoreEntrySeasonOpen(…, 2026) on %s (Brussels time)", (_label, at, expected) => {
      expect(isScoreEntrySeasonOpen(at, 2026)).toBe(expected);
    });

    it.each([
      ["30 June 23:59", brussels("2027-06-30T23:59:59.999", "+02:00"), 2026],
      ["1 July 00:00", brussels("2027-07-01T00:00:00.000", "+02:00"), 2027],
      ["31 December", brussels("2026-12-31T23:59:00.000", "+01:00"), 2026],
      ["1 January", brussels("2027-01-01T00:00:00.000", "+01:00"), 2026],
    ])("oldestOpenScoreEntrySeason on %s (Brussels time)", (_label, at, expected) => {
      expect(oldestOpenScoreEntrySeason(at)).toBe(expected);
    });

    it("agree with each other on both sides of 1 July", () => {
      for (const at of [
        brussels("2027-06-30T23:59:59.999", "+02:00"),
        brussels("2027-07-01T00:00:00.000", "+02:00"),
      ]) {
        const oldest = oldestOpenScoreEntrySeason(at);
        expect(isScoreEntrySeasonOpen(at, oldest)).toBe(true);
        expect(isScoreEntrySeasonOpen(at, oldest - 1)).toBe(false);
      }
    });
  });

  describe("nextSeason (switches on 1 October)", () => {
    it.each([
      ["30 September 23:59", brussels("2026-09-30T23:59:59.999", "+02:00"), 2026],
      ["1 October 00:00", brussels("2026-10-01T00:00:00.000", "+02:00"), 2027],
      ["31 December", brussels("2026-12-31T23:59:00.000", "+01:00"), 2027],
      ["1 January", brussels("2027-01-01T00:00:00.000", "+01:00"), 2027],
      ["1 May", brussels("2027-05-01T00:00:00.000", "+02:00"), 2027],
    ])("%s (Brussels time)", (_label, at, expected) => {
      expect(nextSeason(at)).toBe(expected);
    });

    it("uses the current moment without input", () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-09-30T22:00:00.000Z"));
      expect(nextSeason()).toBe(2027);
    });
  });

  describe("twizzitExportWindow (1 September – 1 September, midnight in Brussels)", () => {
    it("returns the stored window, both ends included", () => {
      const { start, end } = twizzitExportWindow(2026);
      expect(start.toISOString()).toBe("2026-08-31T22:00:00.000Z");
      expect(end.toISOString()).toBe("2027-08-31T22:00:00.000Z");
    });
  });
});

alsoRunInTimezone(__filename, "UTC");
