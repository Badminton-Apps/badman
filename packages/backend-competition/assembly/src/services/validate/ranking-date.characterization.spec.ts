import { EncounterCompetition, Player, RankingSystem, Team } from "@badman/backend-database";
import moment from "moment";
import { AssemblyValidationService } from "./assembly.service";

/**
 * Characterization tests (BAD-409) for the ranking date of the line-up check.
 * They pin today's behaviour so the S3 groundwork (BAD-392) can prove it
 * changes nothing by accident, including the player cache bug it fixes.
 * Tests run with TZ=Europe/Brussels, as production does (jest.global-setup.js),
 * so the May window runs from 30 April 22:00 UTC to 31 May 21:59:59.999 UTC.
 */
const PLAYER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const TEAM_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const iso = (m: moment.Moment) => m.toISOString();

type Internals = {
  getDrawAndSubEvent: () => Promise<unknown>;
  getSeasonSubEventsWithCache: () => Promise<unknown>;
  getClubTeamsWithCache: () => Promise<unknown>;
  getMembershipsWithCache: () => Promise<unknown>;
  batchFetchPlayersWithCache: (
    ids: string[],
    system: RankingSystem,
    start: moment.Moment,
    end: moment.Moment
  ) => Promise<Player[]>;
};

describe("AssemblyValidationService ranking date (characterization)", () => {
  let service: AssemblyValidationService;
  let internals: Internals;

  beforeEach(() => {
    service = new AssemblyValidationService();
    internals = service as unknown as Internals;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("ranking window from the event's line-up setting", () => {
    const windowFor = async (
      event: { season: number; usedRankingUnit?: string; usedRankingAmount?: number },
      now: string
    ) => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] }).setSystemTime(new Date(now));

      jest.spyOn(Team, "findByPk").mockResolvedValue({
        id: TEAM_ID,
        season: event.season,
        clubId: "club-1",
        type: "M",
        teamNumber: 1,
        link: "link-1",
      } as unknown as Team);
      jest.spyOn(Team, "findOne").mockResolvedValue(null);
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
      jest
        .spyOn(RankingSystem, "findByPk")
        .mockResolvedValue({ id: "system-1", amountOfLevels: 12 } as RankingSystem);
      jest.spyOn(internals, "getDrawAndSubEvent").mockResolvedValue({
        draw: null,
        subEvent: { id: "sub-1", getEventCompetition: jest.fn().mockResolvedValue(event) },
      });
      jest.spyOn(internals, "getSeasonSubEventsWithCache").mockResolvedValue([]);
      jest.spyOn(internals, "getClubTeamsWithCache").mockResolvedValue([]);
      jest.spyOn(internals, "getMembershipsWithCache").mockResolvedValue([]);
      const fetch = jest.spyOn(internals, "batchFetchPlayersWithCache").mockResolvedValue([]);

      await service.fetchData({ teamId: TEAM_ID, systemId: "system-1", single1: PLAYER_ID });

      const [, , start, end] = fetch.mock.calls[0];
      return [iso(start), iso(end)];
    };

    it("uses the whole month set on the event (4 months = May) of the season year", async () => {
      expect(
        await windowFor(
          { season: 2026, usedRankingUnit: "months", usedRankingAmount: 4 },
          "2026-10-15T12:00:00.000Z"
        )
      ).toEqual(["2026-04-30T22:00:00.000Z", "2026-05-31T21:59:59.999Z"]);
    });

    it("gives the same window whatever day it is today", async () => {
      const event = { season: 2026, usedRankingUnit: "months", usedRankingAmount: 4 };
      const expected = ["2026-04-30T22:00:00.000Z", "2026-05-31T21:59:59.999Z"];

      expect(await windowFor(event, "2027-01-31T23:00:00.000Z")).toEqual(expected);
      expect(await windowFor(event, "2028-02-29T12:00:00.000Z")).toEqual(expected);
    });

    it("throws when the event has no line-up setting", async () => {
      await expect(windowFor({ season: 2026 }, "2026-10-15T12:00:00.000Z")).rejects.toThrow(
        "EventCompetition usedRankingUnit is not set"
      );
    });
  });

  describe("player cache", () => {
    const systemA = { id: "system-a", amountOfLevels: 12 } as RankingSystem;
    const systemB = { id: "system-b", amountOfLevels: 12 } as RankingSystem;
    const may2025 = [moment("2025-05-01T00:00:00.000Z"), moment("2025-05-31T23:59:59.999Z")];
    const may2026 = [moment("2026-05-01T00:00:00.000Z"), moment("2026-05-31T23:59:59.999Z")];

    it("queries updated, system-filtered places within the window, newest first", async () => {
      const findAll = jest.spyOn(Player, "findAll").mockResolvedValue([]);

      await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2026[0], may2026[1]);

      const include = (findAll.mock.calls[0][0] as { include: { where: unknown }[] }).include;
      const placeInclude = include[1] as {
        where: { rankingDate: Record<symbol, Date[]>; systemId: string; updatePossible: boolean };
        limit: number;
        order: unknown;
      };
      const [between] = Object.getOwnPropertySymbols(placeInclude.where.rankingDate).map(
        (s) => placeInclude.where.rankingDate[s]
      );
      expect(between.map((d) => d.toISOString())).toEqual([
        "2026-05-01T00:00:00.000Z",
        "2026-05-31T23:59:59.999Z",
      ]);
      expect(placeInclude.where.systemId).toBe("system-a");
      expect(placeInclude.where.updatePossible).toBe(true);
      expect(placeInclude.limit).toBe(1);
      expect(placeInclude.order).toEqual([["rankingDate", "DESC"]]);
    });

    it("current behaviour, fixed in BAD-392: reuses a cached player for another season or system", async () => {
      const cachedPlayer = { id: PLAYER_ID, rankingPlaces: [{ single: 5 }] } as unknown as Player;
      const findAll = jest.spyOn(Player, "findAll").mockResolvedValue([cachedPlayer]);

      await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2025[0], may2025[1]);
      const otherSeason = await internals.batchFetchPlayersWithCache(
        [PLAYER_ID],
        systemA,
        may2026[0],
        may2026[1]
      );
      const otherSystem = await internals.batchFetchPlayersWithCache(
        [PLAYER_ID],
        systemB,
        may2026[0],
        may2026[1]
      );

      expect(findAll).toHaveBeenCalledTimes(1);
      expect(otherSeason[0]).toBe(cachedPlayer);
      expect(otherSystem[0]).toBe(cachedPlayer);
    });
  });
});
