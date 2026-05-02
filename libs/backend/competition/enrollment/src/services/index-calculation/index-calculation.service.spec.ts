import { Test, TestingModule } from "@nestjs/testing";
import {
  EventCompetition,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import {
  getIndexFromPlayers,
  INDEX_CALCULATION_FIXTURES,
  SubEventTypeEnum,
} from "@badman/utils";
import { Op } from "sequelize";
import { IndexCalculationService } from "./index-calculation.service";
import { IndexCalculationInput } from "./index-calculation.types";

const SYSTEM_ID = "system-uuid-0000-0000-0000-000000000000";
const SEASON = 2025;
const SUB_EVENT_ID = "subevent-uuid-0000-0000-0000-000000000000";

const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: SYSTEM_ID,
    amountOfLevels: 12,
    primary: true,
    ...overrides,
  }) as unknown as RankingSystem;

const stubPlace = (
  playerId: string,
  single?: number,
  double_?: number,
  mix?: number,
  rankingDate = new Date(`${SEASON}-05-15`)
): RankingPlace =>
  ({
    playerId,
    systemId: SYSTEM_ID,
    single,
    double: double_,
    mix,
    rankingDate,
    updatePossible: true,
  }) as unknown as RankingPlace;

const stubSubEvent = (
  ecOverrides?: Partial<EventCompetition>
): SubEventCompetition =>
  ({
    id: SUB_EVENT_ID,
    eventCompetition: {
      season: SEASON,
      usedRankingUnit: "month",
      usedRankingAmount: 4, // May
      ...ecOverrides,
    } as unknown as EventCompetition,
  }) as unknown as SubEventCompetition;

const minimalInput = (key: string, season = SEASON): IndexCalculationInput => ({
  key,
  type: SubEventTypeEnum.M,
  season,
  players: [{ id: `player-${key}`, gender: "M" }],
});

describe("IndexCalculationService", () => {
  let service: IndexCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndexCalculationService],
    }).compile();

    service = module.get<IndexCalculationService>(IndexCalculationService);
  });

  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // T015: Fixture parity loop
  // -------------------------------------------------------------------------
  describe("parity with getIndexFromPlayers (INDEX_CALCULATION_FIXTURES)", () => {
    for (const fixture of INDEX_CALCULATION_FIXTURES) {
      const hasUngenderedPlayers = fixture.players.some(
        (p) => !("gender" in p) || p.gender === undefined
      );
      if (hasUngenderedPlayers) {
        test.skip(`${fixture.name} (skipped: un-gendered player)`, () => {});
        continue;
      }

      test(fixture.name, async () => {
        jest.spyOn(RankingSystem, "findOne").mockResolvedValue(
          stubSystem({ amountOfLevels: fixture.defaultRanking ?? 12 })
        );
        jest.spyOn(Player, "findAll").mockResolvedValue([]);

        const playerIds = fixture.players.map((_, idx) => `player-${idx}`);
        const placeRows = fixture.players.map((p, idx) =>
          stubPlace(playerIds[idx], p.single, p.double, p.mix)
        );
        jest.spyOn(RankingPlace, "findAll").mockResolvedValue(placeRows);

        const result = await service.calculateOne({
          key: "test-key",
          type: fixture.type,
          season: SEASON,
          players: fixture.players.map((p, idx) => ({
            id: playerIds[idx],
            gender: p.gender as "M" | "F" | undefined,
          })),
        });

        expect(result._tag).toBe("success");
        if (result._tag === "success") {
          const helperExpected = getIndexFromPlayers(
            fixture.type,
            fixture.players,
            fixture.defaultRanking
          );
          expect(result.index).toBe(helperExpected);
          expect(result.index).toBe(fixture.expected);
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // calculate — top-level orchestration
  // -------------------------------------------------------------------------
  describe("calculate", () => {
    it("returns [] immediately without any DB call when inputs is empty", async () => {
      const findOneSpy = jest.spyOn(RankingSystem, "findOne");
      const result = await service.calculate([]);
      expect(result).toEqual([]);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("returns RANKING_SYSTEM_NOT_FOUND for every input when primary system does not exist", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(null);

      const inputs = [minimalInput("k1"), minimalInput("k2")];
      const results = await service.calculate(inputs);

      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r._tag).toBe("failure");
        if (r._tag === "failure") {
          expect(r.error.code).toBe("RANKING_SYSTEM_NOT_FOUND");
        }
      }
    });

    it("surfaces INTERNAL_ERROR for an input that throws unexpectedly during processing", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      // Force fetchBroadPlaceMaps to succeed but computeResult to throw on key "boom"
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      // Override computeResult privately to throw for one specific input
      const origCompute = (service as any).computeResult.bind(service);
      jest.spyOn(service as any, "computeResult").mockImplementation(
        (...args: unknown[]) => {
          const input = args[0] as IndexCalculationInput;
          if (input.key === "boom") throw new Error("Simulated crash");
          return origCompute(...args);
        }
      );

      const inputs = [minimalInput("ok"), minimalInput("boom")];
      const results = await service.calculate(inputs);

      expect(results).toHaveLength(2);
      expect(results[0]._tag).toBe("success");
      expect(results[1]._tag).toBe("failure");
      if (results[1]._tag === "failure") {
        expect(results[1].error.code).toBe("INTERNAL_ERROR");
      }
    });
  });

  // -------------------------------------------------------------------------
  // calculateOne — convenience wrapper
  // -------------------------------------------------------------------------
  describe("calculateOne", () => {
    it("returns the single result from calculate", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([
        stubPlace("player-k1", 8, 8, 12),
      ]);

      const result = await service.calculateOne({
        key: "k1",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "player-k1", gender: "M" }],
      });

      expect(result).toBeDefined();
      expect(result._tag).toBe("success");
    });
  });

  // -------------------------------------------------------------------------
  // T016: Partial failure — missing player does not fail the batch
  // -------------------------------------------------------------------------
  describe("partial failure does not fail the batch", () => {
    it("returns Success for input[0] and PLAYER_NOT_FOUND for input[1]", async () => {
      const goodId = "player-good-0000-0000-0000-000000000000";
      const badId  = "player-bad--0000-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([
        { id: goodId, gender: "M" } as unknown as Player,
      ]);
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([
        stubPlace(goodId, 8, 8, 8),
      ]);

      const results = await service.calculate([
        { key: "good", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: goodId, gender: "M" }] },
        { key: "bad",  type: SubEventTypeEnum.M, season: SEASON, players: [{ id: badId }] },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]._tag).toBe("success");
      expect(results[1]._tag).toBe("failure");
      if (results[1]._tag === "failure") {
        expect(results[1].error.code).toBe("PLAYER_NOT_FOUND");
        expect(results[1].error.playerIds).toContain(badId);
      }
    });
  });

  // -------------------------------------------------------------------------
  // T017: Snapshot dedupe — one RankingPlace.findAll per season
  // -------------------------------------------------------------------------
  describe("snapshot dedupe", () => {
    it("calls RankingPlace.findAll once when three inputs share the same season", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      const spy = jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      await service.calculate([
        { key: "k1", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1", gender: "M" }] },
        { key: "k2", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p2", gender: "M" }] },
        { key: "k3", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p3", gender: "M" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0] as { where: { playerId: string[] } };
      expect(args.where.playerId).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));
    });

    it("calls RankingPlace.findAll once per unique season when inputs span two seasons", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      const spy = jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      await service.calculate([
        { key: "k1", type: SubEventTypeEnum.M, season: 2024, players: [{ id: "p1", gender: "M" }] },
        { key: "k2", type: SubEventTypeEnum.M, season: 2025, players: [{ id: "p2", gender: "M" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // buildBroadWindow — date boundaries verified via findAll call args
  // -------------------------------------------------------------------------
  describe("buildBroadWindow", () => {
    it("uses Jan 1 as start and Dec 31 as end of the given season", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      const spy = jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: 2024, players: [{ id: "p1", gender: "M" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0] as {
        where: { rankingDate: Record<symbol, [Date, Date]> };
      };
      const [start, end] = args.where.rankingDate[Op.between];

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0);  // January
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  // -------------------------------------------------------------------------
  // fetchPlaceMap — dedup: most-recent row per player kept
  // -------------------------------------------------------------------------
  describe("fetchPlaceMap dedup", () => {
    it("keeps only the most-recent RankingPlace row per player (first in DESC order)", async () => {
      const playerId = "player-dedup-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      // Two rows for the same player — findAll returns them in DESC order already.
      const newer = stubPlace(playerId, 4, 4, 4, new Date(`${SEASON}-06-01`));
      const older = stubPlace(playerId, 8, 8, 8, new Date(`${SEASON}-03-01`));
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([newer, older]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: playerId, gender: "M" }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        // newer row wins → single/double = 4 (not 8 from older row)
        expect(result.contributingPlayers[0].single).toBe(4);
        expect(result.contributingPlayers[0].double).toBe(4);
      }
    });
  });

  // -------------------------------------------------------------------------
  // resolveGenders — zero player IDs skips DB call
  // -------------------------------------------------------------------------
  describe("resolveGenders", () => {
    it("does not call Player.findAll when the input player list is empty", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      const playerSpy = jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [] },
      ]);

      expect(playerSpy).not.toHaveBeenCalled();
    });

    it("puts players without gender in DB into notFoundIds", async () => {
      const noGenderId = "player-nogender-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      // Player row exists but gender is null.
      jest.spyOn(Player, "findAll").mockResolvedValue([
        { id: noGenderId, gender: null } as unknown as Player,
      ]);
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        // No gender supplied in input → must look up → found but gender null
        players: [{ id: noGenderId }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("PLAYER_NOT_FOUND");
      }
    });
  });

  // -------------------------------------------------------------------------
  // computeResult — per-player default fill
  // -------------------------------------------------------------------------
  describe("computeResult — default fill", () => {
    it("defaults all components to amountOfLevels when no RankingPlace row exists for a player", async () => {
      const playerId = "player-norate-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem({ amountOfLevels: 10 }));
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      // Return no place rows → player gets default fill.
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: playerId, gender: "M" }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        // With 4 absent players each at level 10, index = 4×(10+10) = 80.
        // The one present player also defaulted to 10+10 = 20, best-4 picks it.
        expect(result.contributingPlayers[0].single).toBe(10);
        expect(result.contributingPlayers[0].double).toBe(10);
        expect(result.contributingPlayers[0].mix).toBe(10);
      }
    });

    it("player with gender in input is never flagged as PLAYER_NOT_FOUND even if absent from DB", async () => {
      const playerId = "player-withgender-0000-0000-000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      // Player.findAll returns nothing (player not in DB).
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        // Gender supplied inline → no DB lookup needed.
        players: [{ id: playerId, gender: "M" }],
      });

      expect(result._tag).toBe("success");
    });

    it("sets missingPlayerCount to max(0, 4 − contributingPlayers.length)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      // Two players — best-2 are both selected, 2 missing.
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([
        stubPlace("p1", 8, 8, 12),
        stubPlace("p2", 8, 8, 12),
      ]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [
          { id: "p1", gender: "M" },
          { id: "p2", gender: "M" },
        ],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.missingPlayerCount).toBe(2);
        expect(result.contributingPlayers).toHaveLength(2);
      }
    });
  });

  // -------------------------------------------------------------------------
  // fetchSubEventWindow — all branches
  // -------------------------------------------------------------------------
  describe("fetchSubEventWindow (via subEventCompetitionId)", () => {
    it("returns SUB_EVENT_NOT_FOUND when SubEventCompetition does not exist", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(null);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("SUB_EVENT_NOT_FOUND");
      }
    });

    it("returns SUB_EVENT_NOT_FOUND when SubEventCompetition has no linked EventCompetition", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(
        { id: SUB_EVENT_ID, eventCompetition: null } as unknown as SubEventCompetition
      );

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("SUB_EVENT_NOT_FOUND");
      }
    });

    it("returns INTERNAL_ERROR when EventCompetition is missing usedRankingUnit", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(
        stubSubEvent({ usedRankingUnit: undefined as unknown as "months" })
      );

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("INTERNAL_ERROR");
      }
    });

    it("returns INTERNAL_ERROR when EventCompetition is missing usedRankingAmount", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(
        stubSubEvent({ usedRankingAmount: null as unknown as number })
      );

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("INTERNAL_ERROR");
      }
    });

    it("returns RANKING_FETCH_FAILED when RankingPlace.findAll throws in the sub-event path", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(stubSubEvent());
      jest.spyOn(RankingPlace, "findAll").mockRejectedValue(new Error("DB error"));

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("RANKING_FETCH_FAILED");
      }
    });

    it("uses the precise snapshot window from EventCompetition when subEventCompetitionId is supplied", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      // usedRankingAmount = 4 → May (month index 4)
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(
        stubSubEvent({ season: 2024, usedRankingAmount: 4 })
      );
      const spy = jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

      await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1", gender: "M" }],
      });

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0] as {
        where: { rankingDate: Record<symbol, [Date, Date]> };
      };
      const [start, end] = args.where.rankingDate[Op.between];

      // start = day 0 of month 4 of 2024 = last day of April 2024
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(3); // April
      expect(start.getDate()).toBe(30);

      // end = last day of May 2024
      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(4); // May
      expect(end.getDate()).toBe(31);
    });

    it("returns a successful result using the precise window", async () => {
      const playerId = "p1";
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue(stubSubEvent());
      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([
        stubPlace(playerId, 6, 6, 12),
      ]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: playerId, gender: "M" }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.contributingPlayers[0].single).toBe(6);
        expect(result.contributingPlayers[0].double).toBe(6);
      }
    });
  });

  // -------------------------------------------------------------------------
  // fetchBroadPlaceMaps — DB error path
  // -------------------------------------------------------------------------
  describe("fetchBroadPlaceMaps DB error", () => {
    it("treats the season as having no ranking data (empty map) when findAll throws, allowing default-fill", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem({ amountOfLevels: 12 }));
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingPlace, "findAll").mockRejectedValue(new Error("DB timeout"));

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1", gender: "M" }],
      });

      // No crash — default fill kicks in (all components = amountOfLevels = 12).
      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.contributingPlayers[0].single).toBe(12);
      }
    });
  });
});
