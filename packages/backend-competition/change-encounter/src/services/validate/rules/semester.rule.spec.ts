import { EncounterCompetition } from "@badman/backend-database";
import { EncounterValidationData } from "../../../models";
import { SemesterRule, SemesterRuleParams } from "./semester.rule";

// ─── Production data: De Voskes 1D vs W&L BV 3D, season 2026 ─────────────────
// IDs pulled directly from production DB.
// This is the exact swap that was blocked by the semester rule before the fix.
//
// Step 1 (succeeded): W&L BV home match moved from 2027-01-03 → 2026-12-20
// Step 2 (was blocked): De Voskes home match proposed to move 2026-12-20 → 2027-01-10

const DE_VOSKES_TEAM_ID = "f22f8597-015e-4fdc-b7e0-4cd4853b9561"; // De Voskes 1D
const WL_BV_TEAM_ID = "215f85da-9de8-4c00-96b7-83cc78c13a77"; //     W&L BV 3D

const DE_VOSKES_HOME_ENC_ID = "df86ecec-5099-4f1b-8bde-177849e874a7"; // De Voskes 1D (H) vs W&L BV 3D (A)
const WL_BV_HOME_ENC_ID = "6e92ca25-8c0a-4b1e-829a-7b3d9985c475"; //    W&L BV 3D (H) vs De Voskes 1D (A)

const SEASON = 2026;

// Mid-swap state: both encounters landed on Dec 20 after step 1
const DE_VOSKES_HOME_DATE = new Date("2026-12-20T16:00:00.000Z");
const WL_BV_HOME_DATE = new Date("2026-12-20T12:00:00.000Z");

// Original dates (before any swap)
const DE_VOSKES_ORIGINAL_DATE = new Date("2026-11-22T16:00:00.000Z"); // semester 1
const WL_BV_ORIGINAL_DATE = new Date("2027-01-03T12:00:00.000Z"); //    semester 2

// Proposed finalization date (the TENTATIVELY_ACCEPTED proposal in production DB)
const PROPOSED_JAN_10 = new Date("2027-01-10T16:00:00.000Z");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEncounter(
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  date: Date,
  homeName: string,
  awayName: string
): EncounterCompetition {
  return {
    id,
    date,
    homeTeamId,
    awayTeamId,
    home: { id: homeTeamId, name: homeName, clubId: "club-devoskes" },
    away: { id: awayTeamId, name: awayName, clubId: "club-wlbv" },
  } as unknown as EncounterCompetition;
}

/**
 * Builds EncounterValidationData exactly as encounter.service.ts does:
 * splits allEncounters into sem1/sem2 by getFullYear(), derives semseter1 from
 * whether the working encounter is in sem1.
 */
function makeData(
  encounter: EncounterCompetition,
  allEncounters: EncounterCompetition[],
  suggestedDates?: { date: Date; locationId: string }[]
): EncounterValidationData {
  const encountersSem1 = allEncounters.filter((e) => e.date?.getFullYear() === SEASON);
  const encountersSem2 = allEncounters.filter((e) => e.date?.getFullYear() === SEASON + 1);
  const indexSem1 = encountersSem1.findIndex((e) => e.id === encounter.id);
  const indexSem2 = encountersSem2.findIndex((e) => e.id === encounter.id);
  const semseter1 = indexSem1 > -1;
  const index = semseter1 ? indexSem1 : indexSem2;

  return {
    encounter,
    encountersSem1,
    encountersSem2,
    semseter1,
    index,
    season: SEASON,
    suggestedDates,
    locations: [],
    draw: {} as never,
  };
}

// Pre-built encounter objects matching production DB rows exactly
const deVoskesHomeEnc = makeEncounter(
  DE_VOSKES_HOME_ENC_ID,
  DE_VOSKES_TEAM_ID,
  WL_BV_TEAM_ID,
  DE_VOSKES_HOME_DATE,
  "De Voskes 1D",
  "W&L BV 3D"
);

const wlBvHomeEnc = makeEncounter(
  WL_BV_HOME_ENC_ID,
  WL_BV_TEAM_ID,
  DE_VOSKES_TEAM_ID,
  WL_BV_HOME_DATE,
  "W&L BV 3D",
  "De Voskes 1D"
);

// ─────────────────────────────────────────────────────────────────────────────

describe("SemesterRule", () => {
  let rule: SemesterRule;

  beforeEach(() => {
    rule = new SemesterRule();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── No suggested dates (viewing encounter status) ──────────────────────────

  describe("no suggestedDates", () => {
    it("produces no error when encounters are in different semesters (normal state)", async () => {
      const deVoskesOriginal = makeEncounter(
        DE_VOSKES_HOME_ENC_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_ORIGINAL_DATE, // Nov 22, sem 1
        "De Voskes 1D",
        "W&L BV 3D"
      );
      const wlBvOriginal = makeEncounter(
        WL_BV_HOME_ENC_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_ORIGINAL_DATE, // Jan 3, sem 2
        "W&L BV 3D",
        "De Voskes 1D"
      );

      const result = await rule.validate(
        makeData(deVoskesOriginal, [deVoskesOriginal, wlBvOriginal])
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("produces an error when both encounters are in semester 1 and no fix is proposed", async () => {
      // This is the mid-swap state: both at Dec 20. Without a proposed date the
      // current-state check must flag it.
      const result = await rule.validate(makeData(deVoskesHomeEnc, [deVoskesHomeEnc, wlBvHomeEnc]));

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe(
        "all.competition.change-encounter.errors.same-semester"
      );
      const params = result.errors![0].params as SemesterRuleParams;
      expect(params.semester).toBe("first");
      expect(params.season).toBe(SEASON);
      expect(params.teamName).toBe("De Voskes 1D");
    });
  });

  // ── Swap scenario — the production bug ────────────────────────────────────

  describe("swap scenario: De Voskes 1D ↔ W&L BV 3D (production encounter)", () => {
    it("allows finalizing step 2 of a swap even when both encounters are currently in semester 1", async () => {
      // Exact production state when the user was blocked:
      //   df86ecec (De Voskes home)  → 2026-12-20  [semester 1]
      //   6e92ca25 (W&L BV home)     → 2026-12-20  [semester 1]  ← moved in step 1
      // Proposed: move df86ecec to 2027-01-10 [semester 2]
      const result = await rule.validate(
        makeData(
          deVoskesHomeEnc,
          [deVoskesHomeEnc, wlBvHomeEnc],
          [{ date: PROPOSED_JAN_10, locationId: "loc-sporthal-solv" }]
        )
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("skips the current-state error entirely when suggestedDates are present", async () => {
      // The current state is broken (both in sem1) but a proposed date is given —
      // the rule must not fire the current-state error at all.
      const result = await rule.validate(
        makeData(
          deVoskesHomeEnc,
          [deVoskesHomeEnc, wlBvHomeEnc],
          [{ date: PROPOSED_JAN_10, locationId: "loc-sporthal-solv" }]
        )
      );

      expect(result.errors).toHaveLength(0);
    });
  });

  // ── With suggested dates ───────────────────────────────────────────────────

  describe("with suggestedDates", () => {
    it("warns when proposed date would land in the same semester as the reverse encounter", async () => {
      // Normal state: De Voskes home in sem1 (Nov 22), W&L home in sem2 (Jan 3).
      // Proposing to move De Voskes home to Feb 2027 (also sem2) → conflict.
      const deVoskesOriginal = makeEncounter(
        DE_VOSKES_HOME_ENC_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_ORIGINAL_DATE,
        "De Voskes 1D",
        "W&L BV 3D"
      );
      const wlBvOriginal = makeEncounter(
        WL_BV_HOME_ENC_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_ORIGINAL_DATE,
        "W&L BV 3D",
        "De Voskes 1D"
      );
      const proposedFeb = new Date("2027-02-14T16:00:00.000Z"); // semester 2, same as W&L

      const result = await rule.validate(
        makeData(
          deVoskesOriginal,
          [deVoskesOriginal, wlBvOriginal],
          [{ date: proposedFeb, locationId: "loc-any" }]
        )
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toBe(
        "all.competition.change-encounter.errors.same-semester-date"
      );
    });

    it("produces no warning when proposed date stays in a different semester from the reverse encounter", async () => {
      // Normal state: De Voskes home in sem1, W&L home in sem2.
      // Proposing to move De Voskes home to a different sem1 date → reverse is still in sem2 → ok.
      const deVoskesOriginal = makeEncounter(
        DE_VOSKES_HOME_ENC_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_ORIGINAL_DATE,
        "De Voskes 1D",
        "W&L BV 3D"
      );
      const wlBvOriginal = makeEncounter(
        WL_BV_HOME_ENC_ID,
        WL_BV_TEAM_ID,
        DE_VOSKES_TEAM_ID,
        WL_BV_ORIGINAL_DATE,
        "W&L BV 3D",
        "De Voskes 1D"
      );
      const proposedOct = new Date("2026-10-11T16:00:00.000Z"); // semester 1, reverse is in sem2

      const result = await rule.validate(
        makeData(
          deVoskesOriginal,
          [deVoskesOriginal, wlBvOriginal],
          [{ date: proposedOct, locationId: "loc-any" }]
        )
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
