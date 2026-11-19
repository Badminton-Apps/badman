import {
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  EventCompetition,
  Player,
} from "@badman/backend-database";
import { ChangeEncounterDateStatus, ChangeEncounterParty } from "@badman/utils";
import { ErrorCode } from "../../../utils/error-codes";
import { EncounterChangeService } from "./encounter-change.service";

/**
 * Characterization tests (BAD-409) for the season and deadline checks of the
 * change-request flow. They pin what the code does today, including two bugs
 * that BAD-391 fixes on purpose:
 * - every encounter in a season is checked against the period-1 deadline
 * - an event without a season falls back to the calendar year
 *
 * The checks run before the transaction, so a transaction that throws
 * CHECKS_PASSED means every season and deadline check let the request through.
 * TZ is pinned to UTC by jest.global-setup.js.
 */
const CHECKS_PASSED = "CHECKS_PASSED";

const at = (iso: string) => new Date(iso);

const P1 = at("2026-12-01T00:00:00.000Z");
const P2 = at("2027-03-01T00:00:00.000Z");

type EventFixture = {
  season?: number | null;
  changeCloseRequestDatePeriod1?: Date | null;
  changeCloseRequestDatePeriod2?: Date | null;
} | null;

describe("EncounterChangeService season and deadline checks (characterization)", () => {
  let service: EncounterChangeService;
  let validate: jest.Mock;

  const user = {
    id: "user-1",
    hasAnyPermission: jest.fn().mockResolvedValue(true),
  } as unknown as Player;

  const encounterWith = (date: Date | undefined, event: EventFixture) => {
    const encounter = {
      id: "encounter-1",
      date,
      locationId: "location-1",
      getHome: jest.fn().mockResolvedValue({ clubId: "club-home" }),
      getAway: jest.fn().mockResolvedValue({ clubId: "club-away" }),
      getDrawCompetition: jest
        .fn()
        .mockResolvedValue(event ? { subEventCompetition: { eventId: "event-1" } } : null),
    };
    jest
      .spyOn(EventCompetition, "findByPk")
      .mockResolvedValue(event as unknown as EventCompetition);
    return encounter;
  };

  const event2026 = (overrides: Partial<NonNullable<EventFixture>> = {}): EventFixture => ({
    season: 2026,
    changeCloseRequestDatePeriod1: P1,
    changeCloseRequestDatePeriod2: P2,
    ...overrides,
  });

  const propose = (encounterDate: Date | undefined, event: EventFixture, proposed: Date) => {
    const encounter = encounterWith(encounterDate, event);
    jest
      .spyOn(EncounterCompetition, "findByPk")
      .mockResolvedValue(encounter as unknown as EncounterCompetition);
    return service.propose(user, {
      encounterId: "encounter-1",
      dates: [{ date: proposed, locationId: "location-1" }],
    } as never);
  };

  const triage = (encounterDate: Date | undefined, event: EventFixture, newDate: Date) => {
    const encounter = encounterWith(encounterDate, event);
    jest.spyOn(EncounterChange, "findByPk").mockResolvedValue({
      id: "change-1",
      encounterId: "encounter-1",
      encounter,
    } as unknown as EncounterChange);
    return service.triage(user, {
      encounterChangeId: "change-1",
      newDates: [{ date: newDate, locationId: "location-1" }],
    } as never);
  };

  const finalize = (encounterDate: Date | undefined, event: EventFixture) => {
    const encounter = encounterWith(encounterDate, event);
    jest.spyOn(EncounterChangeDate, "findByPk").mockResolvedValue({
      id: "date-1",
      date: at("2027-02-20T19:00:00.000Z"),
      status: ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED,
      proposedBy: ChangeEncounterParty.AWAY,
      encounterChange: { id: "change-1", encounterId: "encounter-1", encounter },
    } as unknown as EncounterChangeDate);
    return service.finalize(user, { encounterChangeDateId: "date-1" } as never);
  };

  const passes = (promise: Promise<unknown>) => expect(promise).rejects.toThrow(CHECKS_PASSED);
  const rejectsWith = (promise: Promise<unknown>, code: string) =>
    expect(promise).rejects.toMatchObject({ extensions: { code } });

  beforeEach(() => {
    const sequelize = {
      transaction: jest.fn().mockRejectedValue(new Error(CHECKS_PASSED)),
    };
    validate = jest.fn().mockRejectedValue(new Error(CHECKS_PASSED));
    service = new EncounterChangeService(
      sequelize as never,
      {} as never,
      {} as never,
      { validate } as never
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const now = (iso: string) =>
    jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(at(iso));

  describe("deadline per period (propose)", () => {
    const inSeason = at("2027-02-20T19:00:00.000Z");

    it("accepts a first-half encounter before the period-1 deadline", async () => {
      now("2026-11-15T12:00:00.000Z");
      await passes(propose(at("2026-12-15T19:00:00.000Z"), event2026(), inSeason));
    });

    it("rejects a first-half encounter after the period-1 deadline", async () => {
      now("2026-12-02T12:00:00.000Z");
      await rejectsWith(
        propose(at("2026-12-15T19:00:00.000Z"), event2026(), inSeason),
        ErrorCode.DEADLINE_PASSED
      );
    });

    it("current behaviour, fixed in BAD-391: rejects a second-half encounter after the period-1 deadline", async () => {
      now("2027-01-15T12:00:00.000Z");
      await rejectsWith(
        propose(at("2027-02-20T19:00:00.000Z"), event2026(), inSeason),
        ErrorCode.DEADLINE_PASSED
      );
    });

    it("rejects a second-half encounter after the period-2 deadline", async () => {
      now("2027-03-02T12:00:00.000Z");
      await rejectsWith(
        propose(at("2027-03-20T19:00:00.000Z"), event2026(), inSeason),
        ErrorCode.DEADLINE_PASSED
      );
    });

    it("accepts a request at the exact deadline moment and rejects it 1 ms later", async () => {
      const encounterDate = at("2026-12-15T19:00:00.000Z");
      now("2026-12-01T00:00:00.000Z");
      await passes(propose(encounterDate, event2026(), inSeason));

      now("2026-12-01T00:00:00.001Z");
      await rejectsWith(propose(encounterDate, event2026(), inSeason), ErrorCode.DEADLINE_PASSED);
    });

    it("uses the period-2 deadline for an encounter outside the season's two calendar years", async () => {
      now("2027-01-15T12:00:00.000Z");
      await passes(propose(at("2028-01-10T19:00:00.000Z"), event2026(), inSeason));
    });

    it("uses the period-2 deadline for an encounter without a date", async () => {
      now("2027-01-15T12:00:00.000Z");
      await passes(propose(undefined, event2026(), inSeason));
    });

    it("uses the period-2 deadline when the event has no season", async () => {
      now("2027-01-15T12:00:00.000Z");
      await passes(
        propose(
          at("2026-12-15T19:00:00.000Z"),
          event2026({ season: null }),
          at("2027-09-15T19:00:00.000Z")
        )
      );
    });

    it("skips the deadline check when either deadline is missing", async () => {
      now("2027-04-01T12:00:00.000Z");
      await passes(
        propose(
          at("2027-04-10T19:00:00.000Z"),
          event2026({ changeCloseRequestDatePeriod2: null }),
          at("2027-04-20T19:00:00.000Z")
        )
      );
      await passes(
        propose(
          at("2027-04-10T19:00:00.000Z"),
          event2026({ changeCloseRequestDatePeriod1: null }),
          at("2027-04-20T19:00:00.000Z")
        )
      );
    });

    it("skips the deadline check when the encounter has no event", async () => {
      now("2027-04-01T12:00:00.000Z");
      await passes(propose(at("2027-04-10T19:00:00.000Z"), null, at("2027-09-15T19:00:00.000Z")));
    });
  });

  describe("competition season window for proposed dates (propose)", () => {
    const noDeadlines = () =>
      event2026({ changeCloseRequestDatePeriod1: null, changeCloseRequestDatePeriod2: null });
    const encounterDate = at("2026-12-15T19:00:00.000Z");

    beforeEach(() => now("2026-11-15T12:00:00.000Z"));

    it.each([
      ["31 August 23:59:59.999", false, "2026-08-31T23:59:59.999Z"],
      ["1 September 00:00", true, "2026-09-01T00:00:00.000Z"],
      ["30 April 23:59:59.999", true, "2027-04-30T23:59:59.999Z"],
      ["1 May 00:00", false, "2027-05-01T00:00:00.000Z"],
    ])("season 2026, %s → in season: %s", async (_label, inSeason, iso) => {
      const result = propose(encounterDate, noDeadlines(), at(iso));
      if (inSeason) {
        await passes(result);
      } else {
        await rejectsWith(result, ErrorCode.DATE_OUT_OF_SEASON);
      }
    });

    it("current behaviour, fixed in BAD-391: an event without a season uses the calendar year", async () => {
      now("2027-02-10T12:00:00.000Z");
      const event = event2026({
        season: null,
        changeCloseRequestDatePeriod1: null,
        changeCloseRequestDatePeriod2: null,
      });

      await rejectsWith(
        propose(encounterDate, event, at("2027-02-20T19:00:00.000Z")),
        ErrorCode.DATE_OUT_OF_SEASON
      );
      await passes(propose(encounterDate, event, at("2027-09-15T19:00:00.000Z")));
    });

    it("current behaviour, fixed in BAD-391: an encounter without an event uses the calendar year", async () => {
      now("2027-02-10T12:00:00.000Z");
      await rejectsWith(
        propose(encounterDate, null, at("2027-02-20T19:00:00.000Z")),
        ErrorCode.DATE_OUT_OF_SEASON
      );
    });
  });

  describe("triage uses the same checks", () => {
    it("current behaviour, fixed in BAD-391: rejects a second-half encounter after the period-1 deadline", async () => {
      now("2027-01-15T12:00:00.000Z");
      await rejectsWith(
        triage(at("2027-02-20T19:00:00.000Z"), event2026(), at("2027-02-25T19:00:00.000Z")),
        ErrorCode.DEADLINE_PASSED
      );
    });

    it("accepts a counter-date inside the season before the deadline", async () => {
      now("2026-11-15T12:00:00.000Z");
      await passes(
        triage(at("2026-12-15T19:00:00.000Z"), event2026(), at("2026-12-20T19:00:00.000Z"))
      );
    });

    it("current behaviour, fixed in BAD-391: an event without a season uses the calendar year", async () => {
      now("2027-02-10T12:00:00.000Z");
      await rejectsWith(
        triage(
          at("2027-02-20T19:00:00.000Z"),
          event2026({
            season: null,
            changeCloseRequestDatePeriod1: null,
            changeCloseRequestDatePeriod2: null,
          }),
          at("2027-02-25T19:00:00.000Z")
        ),
        ErrorCode.DATE_OUT_OF_SEASON
      );
    });
  });

  describe("finalize uses the same deadline check", () => {
    it("current behaviour, fixed in BAD-391: rejects a second-half encounter after the period-1 deadline", async () => {
      now("2027-01-15T12:00:00.000Z");
      await rejectsWith(
        finalize(at("2027-02-20T19:00:00.000Z"), event2026()),
        ErrorCode.DEADLINE_PASSED
      );
      expect(validate).not.toHaveBeenCalled();
    });

    it("accepts a first-half encounter before the period-1 deadline", async () => {
      now("2026-11-15T12:00:00.000Z");
      await passes(finalize(at("2026-12-15T19:00:00.000Z"), event2026()));
      expect(validate).toHaveBeenCalled();
    });
  });
});
