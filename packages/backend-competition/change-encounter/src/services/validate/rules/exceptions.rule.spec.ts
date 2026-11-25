import { DrawCompetition, EncounterCompetition } from "@badman/backend-database";
import { InfoEvent } from "@badman/backend-database";
import { EncounterValidationData } from "../../../models";
import { ExceptionRule } from "./exceptions.rule";

// ─── Production scenario: Buggenhout 4H vs Danlie 2H, PBO 2026-2027 ──────────
// Encounter currently on Sep 12 (blocked by YonexBI, allowCompetition: false).
// Users were unable to finalize a move to Sep 18 (not blocked) because the
// ExceptionRule treated the *current* date as an error instead of a warning.

const SEP_12 = new Date("2026-09-11T22:00:00.000Z"); // midnight Brussels = Sep 12
const SEP_18 = new Date("2026-09-18T18:30:00.000Z"); // Sep 18 20:30 Brussels

const YONEXBI: InfoEvent = {
  name: "YonexBI",
  start: new Date("2026-09-11T22:00:00.000Z"), // Sep 12 Brussels
  end: new Date("2026-09-11T22:00:00.000Z"), // Sep 12 Brussels
  allowCompetition: false,
};

const PK: InfoEvent = {
  name: "PK",
  start: new Date("2026-10-30T23:00:00.000Z"),
  end: new Date("2026-10-31T23:00:00.000Z"),
  allowCompetition: false,
};

const VK: InfoEvent = {
  name: "VK",
  start: new Date("2026-11-20T23:00:00.000Z"),
  end: new Date("2026-11-21T23:00:00.000Z"),
  allowCompetition: true,
};

function makeDraw(infoEvents: InfoEvent[]): DrawCompetition {
  return {
    subEventCompetition: {
      eventCompetition: {
        infoEvents,
      },
    },
  } as unknown as DrawCompetition;
}

function makeEncounter(id: string, date: Date): EncounterCompetition {
  return { id, date } as unknown as EncounterCompetition;
}

function makeData(
  encounter: EncounterCompetition,
  infoEvents: InfoEvent[],
  suggestedDates?: { date: Date; locationId: string }[]
): EncounterValidationData {
  return {
    encounter,
    encountersSem1: [],
    encountersSem2: [],
    semseter1: true,
    index: 0,
    season: 2026,
    locations: [],
    draw: makeDraw(infoEvents),
    suggestedDates,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExceptionRule", () => {
  let rule: ExceptionRule;

  beforeEach(() => {
    rule = new ExceptionRule();
  });

  describe("no InfoEvents", () => {
    it("produces no errors or warnings", async () => {
      const encounter = makeEncounter("enc-1", SEP_12);
      const result = await rule.validate(makeData(encounter, []));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("current encounter date on a blocked day", () => {
    it("emits a WARNING (not an error) so finalization is not blocked", async () => {
      const encounter = makeEncounter("enc-1", SEP_12);
      const result = await rule.validate(makeData(encounter, [YONEXBI]));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toBe(
        "all.competition.change-encounter.errors.exception-day"
      );
      expect(result.warnings![0].params).toMatchObject({ exceptionName: "YonexBI" });
    });

    it("production scenario: Sep 12 blocked by YonexBI, propose Sep 18 → warning only, can finalize", async () => {
      // Regression test for: Buggenhout 4H trying to finalize to 18/09 was
      // blocked because Sep 12 (current date) is on YonexBI day.
      const encounter = makeEncounter("enc-buggenhout", SEP_12);
      const result = await rule.validate(
        makeData(encounter, [YONEXBI, PK, VK], [{ date: SEP_18, locationId: "loc-1" }])
      );

      // Sep 18 is not in any InfoEvent → no error
      expect(result.errors).toHaveLength(0);
      // Sep 12 is in YonexBI → warning
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].params).toMatchObject({ exceptionName: "YonexBI" });
    });
  });

  describe("proposed date on a blocked day", () => {
    it("emits an ERROR when the proposed date falls in a blocked InfoEvent", async () => {
      const encounter = makeEncounter("enc-1", SEP_18); // current date fine
      const pkDate = new Date("2026-10-31T18:00:00.000Z"); // inside PK window
      const result = await rule.validate(
        makeData(encounter, [PK], [{ date: pkDate, locationId: "loc-1" }])
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe(
        "all.competition.change-encounter.errors.exception-day"
      );
      expect(result.errors![0].params).toMatchObject({ exceptionName: "PK" });
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("allowCompetition: true", () => {
    it("does not block dates that fall in an explicitly-allowed InfoEvent", async () => {
      const encounter = makeEncounter("enc-1", SEP_18);
      const vkDate = new Date("2026-11-21T18:00:00.000Z"); // inside VK window (allowCompetition: true)
      const result = await rule.validate(
        makeData(encounter, [VK], [{ date: vkDate, locationId: "loc-1" }])
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("allowCompetition: null / undefined", () => {
    it("treats a null allowCompetition as blocking (same as false)", async () => {
      const infoEvent: InfoEvent = {
        name: "UnsetFlag",
        start: new Date("2026-09-11T22:00:00.000Z"),
        end: new Date("2026-09-11T22:00:00.000Z"),
        allowCompetition: undefined,
      };
      const encounter = makeEncounter("enc-1", SEP_12);
      const result = await rule.validate(makeData(encounter, [infoEvent]));

      // Current date is on the unset event → warning (not error)
      expect(result.warnings).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("findEncountersOnExceptionDays helper", () => {
    it("returns empty when infoEvents is empty", () => {
      const result = rule.findEncountersOnExceptionDays(SEP_12, "enc-1", []);
      expect(result).toHaveLength(0);
    });

    it("returns a match when date falls within a blocked window (inclusive)", () => {
      const result = rule.findEncountersOnExceptionDays(SEP_12, "enc-1", [YONEXBI]);
      expect(result).toHaveLength(1);
      expect(result[0].params).toMatchObject({
        encounterId: "enc-1",
        exceptionName: "YonexBI",
      });
    });

    it("returns nothing when date is outside the blocked window", () => {
      const result = rule.findEncountersOnExceptionDays(SEP_18, "enc-1", [YONEXBI]);
      expect(result).toHaveLength(0);
    });
  });
});
