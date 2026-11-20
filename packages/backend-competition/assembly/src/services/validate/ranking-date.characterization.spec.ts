jest.mock("@badman/backend-database", () => ({
  ...jest.requireActual("@badman/backend-database"),
  findLatestRankingPlaces: jest.fn(),
}));

import {
  EncounterCompetition,
  LatestRankingPlace,
  Player,
  RankingSystem,
  Team,
  findLatestRankingPlaces,
} from "@badman/backend-database";
import { CalendarRange } from "@badman/utils";
import { AssemblyValidationService } from "./assembly.service";

/**
 * Characterization tests (BAD-409) for the ranking date of the line-up check.
 * They pin today's behaviour so the S3 groundwork (BAD-392) can prove it
 * changes nothing by accident. BAD-392 fixed the player cache bug they pinned.
 * TZ is pinned to UTC by jest.global-setup.js.
 */
const PLAYER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const TEAM_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const lookup = findLatestRankingPlaces as jest.MockedFunction<typeof findLatestRankingPlaces>;

type Internals = {
  getDrawAndSubEvent: () => Promise<unknown>;
  getSeasonSubEventsWithCache: () => Promise<unknown>;
  getClubTeamsWithCache: () => Promise<unknown>;
  getMembershipsWithCache: () => Promise<unknown>;
  batchFetchPlayersWithCache: (
    ids: string[],
    system: RankingSystem,
    window: CalendarRange
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
    lookup.mockReset();
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

      const [, , window] = fetch.mock.calls[0];
      return window;
    };

    it("uses the whole month set on the event (4 months = May) of the season year", async () => {
      expect(
        await windowFor(
          { season: 2026, usedRankingUnit: "months", usedRankingAmount: 4 },
          "2026-10-15T12:00:00.000Z"
        )
      ).toEqual({ from: "2026-05-01", to: "2026-05-31" });
    });

    it("gives the same window whatever day it is today", async () => {
      const event = { season: 2026, usedRankingUnit: "months", usedRankingAmount: 4 };
      const expected = { from: "2026-05-01", to: "2026-05-31" };

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
    const may2025 = { from: "2025-05-01", to: "2025-05-31" };
    const may2026 = { from: "2026-05-01", to: "2026-05-31" };

    it("looks up updated, system-filtered places within the window", async () => {
      const findAll = jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([{ id: PLAYER_ID } as unknown as Player]);
      lookup.mockResolvedValue(new Map([[PLAYER_ID, { single: 5 } as LatestRankingPlace]]));

      const [player] = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2026);

      expect(lookup).toHaveBeenCalledWith({
        playerIds: [PLAYER_ID],
        systemId: "system-a",
        onOrAfter: "2026-05-01",
        onOrBefore: "2026-05-31",
        updatePossibleOnly: true,
      });
      const include = (findAll.mock.calls[0][0] as { include: unknown[] }).include;
      expect(include).toHaveLength(1);
      expect(player.rankingPlaces?.[0]?.single).toBe(5);
    });

    it("gives a player without a place in the window no ranking places", async () => {
      jest.spyOn(Player, "findAll").mockResolvedValue([{ id: PLAYER_ID } as unknown as Player]);
      lookup.mockResolvedValue(new Map());

      const [player] = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2026);

      expect(player.rankingPlaces).toEqual([]);
    });

    it("does not reuse a cached player for another season or system (BAD-392)", async () => {
      const findAll = jest
        .spyOn(Player, "findAll")
        .mockImplementation(async () => [{ id: PLAYER_ID } as unknown as Player]);
      lookup.mockImplementation(async ({ systemId, onOrBefore }) => {
        const single = {
          "system-a|2025-05-31": 5,
          "system-a|2026-05-31": 6,
          "system-b|2026-05-31": 7,
        }[`${systemId}|${onOrBefore}`];
        return new Map([[PLAYER_ID, { single } as LatestRankingPlace]]);
      });

      const first = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2025);
      const otherSeason = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2026);
      const otherSystem = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemB, may2026);
      const sameAgain = await internals.batchFetchPlayersWithCache([PLAYER_ID], systemA, may2025);

      expect(findAll).toHaveBeenCalledTimes(3);
      expect(lookup).toHaveBeenCalledTimes(3);
      expect(first[0].rankingPlaces?.[0]?.single).toBe(5);
      expect(otherSeason[0].rankingPlaces?.[0]?.single).toBe(6);
      expect(otherSystem[0].rankingPlaces?.[0]?.single).toBe(7);
      expect(sameAgain[0]).toBe(first[0]);
    });
  });
});
