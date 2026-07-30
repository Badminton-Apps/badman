import { EncounterCompetition, Location } from "@badman/backend-database";
import { EncounterValidationData } from "../../../models";
import { LocationRule } from "./location-free.rule";

// Helpers ─────────────────────────────────────────────────────────────────────

const LOCATION_ID = "loc-test-1";
const ENCOUNTER_ID = "enc-test-1";

/**
 * Build a minimal Location mock with one or two availability day slots.
 * dates/times are in Europe/Brussels local time (the rule converts UTC dates).
 */
function makeLocation(
  slots: Array<{ day: string; startTime: string; courts: number }>,
  id = LOCATION_ID
): Location {
  return {
    id,
    name: "Test Sporthal",
    availabilities: [
      {
        id: "avail-1",
        season: 2025,
        locationId: id,
        days: slots,
        exceptions: [],
      },
    ],
  } as unknown as Location;
}

function makeEncounter(date: Date, locationId = LOCATION_ID): EncounterCompetition {
  return { id: ENCOUNTER_ID, date, locationId } as unknown as EncounterCompetition;
}

function makeData(
  encounter: EncounterCompetition,
  locations: Location[],
  suggestedDates?: { date: Date; locationId: string }[]
): EncounterValidationData {
  return {
    encounter,
    locations,
    suggestedDates,
    encountersSem1: [],
    encountersSem2: [],
    draw: {} as never,
    season: 2025,
    semseter1: true,
    index: 0,
  };
}

// Oct 19 2025 is CEST (UTC+2) — 17:00 UTC = 19:00 Brussels → "sunday 19:00"
const SUNDAY_DATE = new Date("2025-10-19T17:00:00.000Z");
// Dec 27 2025 is CET (UTC+1) — 17:00 UTC = 18:00 Brussels → "saturday 18:00"
const SATURDAY_DATE = new Date("2025-12-27T17:00:00.000Z");
// Same as SUNDAY_DATE but a different week: Nov 2 (still CEST in 2025)
const SUNDAY_DATE_2 = new Date("2025-11-02T18:00:00.000Z"); // 18:00 UTC = 19:00 CET (UTC+1 from Oct 26)

// A location with Sunday 19:00 (8 courts, threshold 4) and Saturday 18:00 (4 courts, threshold 2)
const LOCATION = makeLocation([
  { day: "sunday", startTime: "19:00", courts: 8 },
  { day: "saturday", startTime: "18:00", courts: 4 },
]);

// ─────────────────────────────────────────────────────────────────────────────

describe("LocationRule", () => {
  let rule: LocationRule;

  beforeEach(() => {
    rule = new LocationRule();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── No date change proposed ─────────────────────────────────────────────────

  describe("no suggestedDates (viewing encounter status)", () => {
    it("produces no errors or warnings when slot is within capacity", async () => {
      // 4 encounters, 8 courts → 4 ≤ 4 (threshold) → ok
      jest
        .spyOn(EncounterCompetition, "findAll")
        .mockResolvedValue(Array(4).fill({ id: "x" }) as never);

      const result = await rule.validate(makeData(makeEncounter(SUNDAY_DATE), [LOCATION]));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("produces a warning when current slot is overcapacity", async () => {
      // 6 encounters, 8 courts → 6 > 4 (threshold) → overcapacity
      jest
        .spyOn(EncounterCompetition, "findAll")
        .mockResolvedValue(Array(6).fill({ id: "x" }) as never);

      const result = await rule.validate(makeData(makeEncounter(SUNDAY_DATE), [LOCATION]));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toBe(
        "all.competition.change-encounter.errors.location-not-free"
      );
    });

    it("produces an error when the encounter time has no configured slot", async () => {
      // SATURDAY_DATE doesn't match the only slot "sunday 19:00" → no slot found
      const sundayOnlyLocation = makeLocation([{ day: "sunday", startTime: "19:00", courts: 8 }]);
      jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([] as never);

      const result = await rule.validate(
        makeData(makeEncounter(SATURDAY_DATE), [sundayOnlyLocation])
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe(
        "all.competition.change-encounter.errors.location-no-timeslot"
      );
    });
  });

  // ── Date change proposed / finalized ───────────────────────────────────────

  describe("with suggestedDates (proposing / finalizing a date change)", () => {
    it("does NOT check the current slot even when it is overcapacity", async () => {
      // Current slot (Sunday, 8 courts) would have 6 encounters → overcapacity
      // but since we're moving away it must be completely ignored.
      const findAll = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue(
        [] as never // proposed slot is empty
      );

      const result = await rule.validate(
        makeData(
          makeEncounter(SUNDAY_DATE),
          [LOCATION],
          [{ date: SATURDAY_DATE, locationId: LOCATION_ID }]
        )
      );

      // findAll called exactly once — for the proposed Saturday slot, not the current Sunday
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it("produces no errors when proposed slot is within capacity", async () => {
      // 0 existing at proposed Saturday + 1 (isSuggested) = 1 → 1 ≤ 2 (threshold for 4 courts) → ok
      jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([] as never);

      const result = await rule.validate(
        makeData(
          makeEncounter(SUNDAY_DATE),
          [LOCATION],
          [{ date: SATURDAY_DATE, locationId: LOCATION_ID }]
        )
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("produces a warning (not an error) when proposed slot is overcapacity", async () => {
      // 2 existing at proposed Saturday + 1 (isSuggested) = 3 → 3 > 2 (threshold) → overcapacity
      jest
        .spyOn(EncounterCompetition, "findAll")
        .mockResolvedValue(Array(2).fill({ id: "x" }) as never);

      const result = await rule.validate(
        makeData(
          makeEncounter(SUNDAY_DATE),
          [LOCATION],
          [{ date: SATURDAY_DATE, locationId: LOCATION_ID }]
        )
      );

      // Overcapacity at the proposed slot is advisory — should not block finalization
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toBe(
        "all.competition.change-encounter.errors.location-not-free"
      );
    });

    it("produces an error when proposed slot has no configured timeslot", async () => {
      // Propose moving to a Sunday but location only has Saturday availability
      const saturdayOnlyLocation = makeLocation([
        { day: "saturday", startTime: "18:00", courts: 4 },
      ]);
      jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([] as never);

      // Propose moving to SUNDAY_DATE_2 — but the location only has Saturday slots
      const result = await rule.validate(
        makeData(
          makeEncounter(SATURDAY_DATE),
          [saturdayOnlyLocation],
          [{ date: SUNDAY_DATE_2, locationId: LOCATION_ID }]
        )
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe(
        "all.competition.change-encounter.errors.location-no-timeslot"
      );
    });

    it("skips a proposed date that is the same as the current date", async () => {
      const findAll = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([] as never);

      const result = await rule.validate(
        makeData(
          makeEncounter(SUNDAY_DATE),
          [LOCATION],
          [
            { date: SUNDAY_DATE, locationId: LOCATION_ID }, // same as encounter.date
          ]
        )
      );

      // Nothing to check — proposed date == current date → skipped
      expect(findAll).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("adds a warning when proposed location is not in the locations list", async () => {
      const findAll = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([] as never);

      const result = await rule.validate(
        makeData(
          makeEncounter(SUNDAY_DATE),
          [LOCATION],
          [{ date: SATURDAY_DATE, locationId: "unknown-loc-id" }]
        )
      );

      expect(findAll).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toBe(
        "all.competition.change-encounter.errors.location-not-found"
      );
    });
  });
});
