import { determineEncounterAction, EncounterCheckInput } from "../guards";
import moment from "moment";

function makeInput(overrides: Partial<EncounterCheckInput> = {}): EncounterCheckInput {
  return {
    checkEncounterForFilledIn: true,
    entered: false,
    accepted: false,
    hasComment: false,
    encounterDate: moment().subtract(50, "hours").toDate(),
    enteredOn: null,
    awayClubHasSlug: true,
    autoAcceptEnabled: true,
    now: new Date(),
    ...overrides,
  };
}

describe("determineEncounterAction", () => {
  describe("when checkEncounterForFilledIn is false", () => {
    it("should return none", () => {
      const result = determineEncounterAction(
        makeInput({ checkEncounterForFilledIn: false })
      );
      expect(result).toEqual({ action: "none" });
    });
  });

  describe("when encounter has a comment", () => {
    it("should return notify-has-comment", () => {
      const result = determineEncounterAction(makeInput({ hasComment: true }));
      expect(result).toEqual({ action: "notify-has-comment" });
    });
  });

  describe("when encounter is not entered", () => {
    it("should return notify-not-entered after 24 hours", () => {
      const now = new Date();
      const encounterDate = moment(now).subtract(25, "hours").toDate();

      const result = determineEncounterAction(
        makeInput({ entered: false, encounterDate, now })
      );
      expect(result).toEqual({ action: "notify-not-entered" });
    });

    it("should return none before 24 hours", () => {
      const now = new Date();
      const encounterDate = moment(now).subtract(23, "hours").toDate();

      const result = determineEncounterAction(
        makeInput({ entered: false, encounterDate, now })
      );
      expect(result).toEqual({ action: "none" });
    });
  });

  describe("when encounter is entered but not accepted after 48 hours", () => {
    const now = new Date();
    const encounterDate = moment(now).subtract(50, "hours").toDate();
    // Entered on time (within 36h of encounter)
    const enteredOnTime = moment(encounterDate).add(10, "hours").toISOString();
    // Entered late
    const enteredLate = moment(encounterDate).add(40, "hours").toISOString();

    it("should auto-accept when entered on time and >36h passed since entered", () => {
      // Entered 10h after encounter, now is 50h after encounter = 40h since entered
      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: enteredOnTime,
          now,
          autoAcceptEnabled: true,
        })
      );
      expect(result).toEqual({ action: "auto-accept" });
    });

    it("should return auto-accept-disabled when config is off", () => {
      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: enteredOnTime,
          now,
          autoAcceptEnabled: false,
        })
      );
      expect(result).toEqual({ action: "auto-accept-disabled" });
    });

    it("should return auto-accept-too-early when not enough time passed", () => {
      // Entered 10h after encounter, now is only 30h after encounter = 20h since entered
      const recentNow = moment(encounterDate).add(49, "hours").toDate();
      const recentEnteredOn = moment(encounterDate).add(30, "hours").toISOString();

      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: recentEnteredOn,
          now: recentNow,
        })
      );
      expect(result.action).toBe("auto-accept-too-early");
    });

    it("should apply late-entry penalty when entered after 36h", () => {
      // Entered late (40h after encounter). Now is 50h after encounter.
      // Late penalty: hoursPassedEntered = now - (entered + 36h) = 50h - (40h + 36h) = negative
      // So should be too early
      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: enteredLate,
          now,
        })
      );
      expect(result.action).toBe("auto-accept-too-early");
    });

    it("should auto-accept late entry after sufficient time", () => {
      // Entered late at 40h. Need 36h after (entered + 36h) = 40+36+36 = 112h after encounter
      const lateNow = moment(encounterDate).add(113, "hours").toDate();

      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: enteredLate,
          now: lateNow,
          autoAcceptEnabled: true,
        })
      );
      expect(result).toEqual({ action: "auto-accept" });
    });

    it("should notify-not-accepted when away club has no slug", () => {
      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: enteredOnTime,
          now,
          awayClubHasSlug: false,
        })
      );
      expect(result).toEqual({ action: "notify-not-accepted" });
    });

    it("should notify-not-accepted when enteredOn is invalid", () => {
      const result = determineEncounterAction(
        makeInput({
          entered: true,
          accepted: false,
          encounterDate,
          enteredOn: "not-a-date",
          now,
          awayClubHasSlug: true,
        })
      );
      // moment("not-a-date").isValid() is false → falls to notify-not-accepted
      expect(result).toEqual({ action: "notify-not-accepted" });
    });
  });

  describe("when encounter is entered and accepted", () => {
    it("should return none", () => {
      const result = determineEncounterAction(
        makeInput({ entered: true, accepted: true })
      );
      expect(result).toEqual({ action: "none" });
    });
  });
});
