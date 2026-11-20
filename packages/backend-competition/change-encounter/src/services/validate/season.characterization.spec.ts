import { EncounterCompetition, Location } from "@badman/backend-database";
import { EncounterValidationData } from "../../models";
import { EncounterValidationService } from "./encounter.service";
import { DatePeriodRule } from "./rules/dates-in-period";
import { SemesterRule } from "./rules/semester.rule";
import { TeamClubRule } from "./rules/team-club.rule";

/**
 * Characterization tests (BAD-409) for how change-encounter validation works
 * out the season and its two halves. They pin today's behaviour so the S3
 * groundwork (BAD-390/391) can prove it changes nothing by accident.
 *
 * The halves are calendar years: every encounter in the season's start year is
 * "semester 1", every encounter in the next calendar year (including May and
 * June) is "semester 2". Since BAD-391 the season module reads dates on the
 * Brussels calendar (spec 039, FR-010a). TZ is pinned to UTC by
 * jest.global-setup.js.
 */
const at = (iso: string) => new Date(iso);

type EncounterRow = {
  id: string;
  date?: Date;
  homeTeamId: string;
  awayTeamId: string;
  home: { id: string; name: string; clubId: string };
  away: { id: string; name: string; clubId: string };
  toJSON: () => EncounterRow;
};

const row = (
  id: string,
  date: Date | undefined,
  homeTeamId = "team-a",
  awayTeamId = "team-b",
  clubs: [string, string] = ["club-a", "club-b"]
): EncounterRow => {
  const r: EncounterRow = {
    id,
    date,
    homeTeamId,
    awayTeamId,
    home: { id: homeTeamId, name: homeTeamId, clubId: clubs[0] },
    away: { id: awayTeamId, name: awayTeamId, clubId: clubs[1] },
    toJSON: () => ({ ...r }),
  };
  return r;
};

describe("change-encounter season handling (characterization)", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("EncounterValidationService.fetchData: season and semester split", () => {
    let locationWhere: unknown;

    const fetchFor = async (workingId: string, encounters: EncounterRow[]) => {
      const working = encounters.find((e) => e.id === workingId);
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue({
        ...working,
        locationId: "location-1",
        getDrawCompetition: jest.fn().mockResolvedValue({
          getEncounterCompetitions: jest.fn().mockResolvedValue(encounters),
        }),
      } as unknown as EncounterCompetition);
      jest.spyOn(Location, "findAll").mockImplementation((async (options: {
        include: { where: unknown }[];
      }) => {
        locationWhere = options.include[0].where;
        return [];
      }) as never);

      return new EncounterValidationService().fetchData({
        teamId: "team-a",
        encounterId: workingId,
      });
    };

    const ids = (list: EncounterCompetition[]) => list.map((e) => e.id);

    it("splits the season by calendar year: Sep–Dec is semester 1, Jan–Jun is semester 2", async () => {
      const data = await fetchFor("dec", [
        row("sep", at("2026-09-20T19:00:00.000Z")),
        row("dec", at("2026-12-31T19:00:00.000Z")),
        row("jan", at("2027-01-01T10:00:00.000Z")),
        row("may", at("2027-05-15T19:00:00.000Z")),
      ]);

      expect(data.season).toBe(2026);
      expect(ids(data.encountersSem1)).toEqual(["sep", "dec"]);
      expect(ids(data.encountersSem2)).toEqual(["jan", "may"]);
      expect(data.semseter1).toBe(true);
      expect(data.index).toBe(1);
      expect(locationWhere).toEqual({ season: 2026 });
    });

    it("marks a January encounter as semester 2", async () => {
      const data = await fetchFor("jan", [
        row("sep", at("2026-09-20T19:00:00.000Z")),
        row("jan", at("2027-01-01T10:00:00.000Z")),
      ]);

      expect(data.semseter1).toBe(false);
      expect(data.index).toBe(0);
    });

    it("uses the earliest season of the dated encounters", async () => {
      // An April encounter belongs to the previous season, which shifts the
      // whole split one year back.
      const data = await fetchFor("sep", [
        row("apr", at("2026-04-20T19:00:00.000Z")),
        row("sep", at("2026-09-20T19:00:00.000Z")),
      ]);

      expect(data.season).toBe(2025);
      expect(ids(data.encountersSem1)).toEqual([]);
      expect(ids(data.encountersSem2)).toEqual(["apr", "sep"]);
      expect(data.semseter1).toBe(false);
    });

    it("ignores undated encounters for the season and leaves them out of both semesters", async () => {
      const data = await fetchFor("sep", [
        row("undated", undefined),
        row("sep", at("2026-09-20T19:00:00.000Z")),
      ]);

      expect(data.season).toBe(2026);
      expect(ids(data.encountersSem1)).toEqual(["sep"]);
      expect(ids(data.encountersSem2)).toEqual([]);
    });

    it("falls back to the current season when no encounter has a date", async () => {
      jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(at("2027-02-10T12:00:00.000Z"));
      const data = await fetchFor("undated", [row("undated", undefined)]);

      expect(data.season).toBe(2026);
      expect(data.index).toBe(-1);
      expect(data.semseter1).toBe(false);
    });
  });

  describe("DatePeriodRule: competition window 1 September – 30 April", () => {
    const rule = new DatePeriodRule();

    const data = (
      encounterDate: Date,
      season: number | undefined,
      suggested?: Date[]
    ): EncounterValidationData =>
      ({
        encounter: row("enc-1", encounterDate),
        season,
        suggestedDates: suggested?.map((date) => ({ date, locationId: "location-1" })),
      }) as unknown as EncounterValidationData;

    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(at("2026-08-15T12:00:00.000Z"));
    });

    it.each([
      ["31 August", false, "2026-08-31T19:00:00.000Z"],
      ["1 September", true, "2026-09-01T00:00:00.000Z"],
      ["30 April late evening", true, "2027-04-30T23:59:00.000+02:00"],
      ["1 May", false, "2027-05-01T00:00:00.000Z"],
    ])("encounter on %s is in period: %s", async (_label, inPeriod, iso) => {
      const result = await rule.validate(data(at(iso), 2026));
      expect(result.errors).toHaveLength(inPeriod ? 0 : 1);
    });

    it("uses the Brussels date of the encounter (FR-010a)", async () => {
      // 30 April 23:59 UTC is already 1 May in Brussels.
      const result = await rule.validate(data(at("2027-04-30T23:59:00.000Z"), 2026));
      expect(result.errors).toHaveLength(1);
    });

    it("reports the calendar year of the date as the season in the error", async () => {
      const result = await rule.validate(data(at("2027-05-01T10:00:00.000Z"), 2026));
      expect(result.errors[0]).toMatchObject({
        message: "all.competition.change-encounter.errors.date-out-of-period",
        params: { season: 2027, periodStart: "01/09/2026", periodEnd: "30/04/2027" },
      });
    });

    it("uses the current season when the data has no season", async () => {
      // 15 August 2026 → enrollmentSeason() = 2026 → window 1 Sep 2026 – 30 Apr 2027
      const result = await rule.validate(data(at("2026-10-01T19:00:00.000Z"), undefined));
      expect(result.errors).toHaveLength(0);
    });

    it("treats season 0 as missing and uses the current season", async () => {
      const result = await rule.validate(data(at("2026-10-01T19:00:00.000Z"), 0));
      expect(result.errors).toHaveLength(0);
    });

    it("warns for a suggested date on the same day, in the past, or outside the window", async () => {
      const result = await rule.validate(
        data(at("2026-10-01T19:00:00.000Z"), 2026, [
          at("2026-10-01T10:00:00.000Z"),
          at("2026-08-14T19:00:00.000Z"),
          at("2027-05-01T19:00:00.000Z"),
          at("2027-04-30T19:00:00.000Z"),
        ])
      );

      expect(result.warnings.map((w) => w.message)).toEqual([
        "all.competition.change-encounter.errors.same-date",
        "all.competition.change-encounter.errors.past-date",
        "all.competition.change-encounter.errors.date-out-of-period",
      ]);
    });
  });

  describe("semester of a suggested date (SemesterRule, TeamClubRule)", () => {
    // The reverse encounter (team-b at home) is in semester 1.
    const working = row("working", at("2027-02-14T19:00:00.000Z"), "team-a", "team-b");
    const reverse = row("reverse", at("2026-10-04T19:00:00.000Z"), "team-b", "team-a");

    const data = (suggested: Date): EncounterValidationData =>
      ({
        encounter: working,
        encountersSem1: [reverse],
        encountersSem2: [working],
        semseter1: false,
        index: 0,
        season: 2026,
        suggestedDates: [{ date: suggested, locationId: "location-1" }],
      }) as unknown as EncounterValidationData;

    it.each([
      ["31 December 2026", true, "2026-12-31T19:00:00.000Z"],
      ["1 January 2027", false, "2027-01-01T10:00:00.000Z"],
      ["1 May 2027", false, "2027-05-01T10:00:00.000Z"],
      ["15 August 2026", true, "2026-08-15T10:00:00.000Z"],
    ])("SemesterRule treats %s as semester 1: %s", async (_label, semester1, iso) => {
      const result = await new SemesterRule().validate(data(at(iso)));
      // A warning means the suggested date lands in the reverse encounter's semester (1).
      expect(result.warnings).toHaveLength(semester1 ? 1 : 0);
    });

    it("TeamClubRule uses the same calendar-year split for suggested dates", async () => {
      const sameClub: [string, string] = ["club-a", "club-a"];
      const w = row("working", at("2027-02-14T19:00:00.000Z"), "team-a", "team-b", sameClub);
      const other = row("other", at("2026-12-31T19:00:00.000Z"), "team-a", "team-c", sameClub);
      const base = {
        encounter: w,
        encountersSem1: [other],
        encountersSem2: [w],
        semseter1: false,
        index: 0,
        season: 2026,
      };

      // 31 December is semester 1, where team-a already plays on that day.
      const dec31 = await new TeamClubRule().validate({
        ...base,
        suggestedDates: [{ date: at("2026-12-31T10:00:00.000Z"), locationId: "location-1" }],
      } as unknown as EncounterValidationData);
      expect(dec31.warnings.map((x) => x.message)).toContain(
        "all.competition.change-encounter.errors.team-conflict"
      );

      // 1 January is semester 2, so the 31 December encounter is not compared.
      const jan1 = await new TeamClubRule().validate({
        ...base,
        suggestedDates: [{ date: at("2027-01-01T10:00:00.000Z"), locationId: "location-1" }],
      } as unknown as EncounterValidationData);
      expect(jan1.warnings.map((x) => x.message)).not.toContain(
        "all.competition.change-encounter.errors.team-conflict"
      );
    });
  });
});
