import { Test, TestingModule } from "@nestjs/testing";
import {
  EventCompetition,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { IndexCalculationService } from "./index-calculation.service";
import { IndexCalculationInput } from "./index-calculation.types";

const SYSTEM_ID = "system-uuid-0000-0000-0000-000000000000";
const SEASON = 2025;
const SUB_EVENT_ID = "subevent-uuid-0000-0000-0000-000000000000";

const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: SYSTEM_ID,
    amountOfLevels: 12,
    maxDiffLevels: 2,
    primary: true,
    ...overrides,
  }) as unknown as RankingSystem;

const stubPlace = (
  playerId: string,
  single?: number,
  double_?: number,
  mix?: number,
  rankingDate = new Date(SEASON, 4, 15) // May 15 of season — within validator cutoff
): RankingPlace =>
  ({
    playerId,
    systemId: SYSTEM_ID,
    single,
    double: double_,
    mix,
    rankingDate,
  }) as unknown as RankingPlace;

const stubPlayer = (id: string, gender: "M" | "F" = "M"): Player =>
  ({ id, gender }) as unknown as Player;

const stubSubEvent = (
  type: SubEventTypeEnum = SubEventTypeEnum.M,
  ecOverrides?: Partial<EventCompetition>
): SubEventCompetition =>
  ({
    id: SUB_EVENT_ID,
    eventType: type,
    eventCompetition: {
      season: SEASON,
      ...ecOverrides,
    } as unknown as EventCompetition,
  }) as unknown as SubEventCompetition;

const minimalInput = (key: string, season = SEASON): IndexCalculationInput => ({
  key,
  type: SubEventTypeEnum.M,
  season,
  players: [{ id: `player-${key}` }],
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
  // Top-level orchestration
  // -------------------------------------------------------------------------
  describe("calculate", () => {
    it("returns [] immediately without any DB call when inputs is empty", async () => {
      const findOneSpy = jest.spyOn(RankingSystem, "findOne");
      const result = await service.calculate([]);
      expect(result).toEqual([]);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("returns RANKING_SYSTEM_NOT_FOUND for every input when neither primary nor explicit system resolves", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(null);
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([stubPlayer("player-k1"), stubPlayer("player-k2")]);

      const results = await service.calculate([minimalInput("k1"), minimalInput("k2")]);

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
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([stubPlayer("player-ok"), stubPlayer("player-boom")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      const origCompute = (
        service as unknown as { computeResult: (...a: unknown[]) => unknown }
      ).computeResult.bind(service);
      jest
        .spyOn(service as unknown as { computeResult: jest.Mock }, "computeResult")
        .mockImplementation((...args: unknown[]) => {
          const input = args[0] as IndexCalculationInput;
          if (input.key === "boom") throw new Error("Simulated crash");
          return origCompute(...args);
        });

      const results = await service.calculate([minimalInput("ok"), minimalInput("boom")]);

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
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("player-k1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("player-k1", 8, 8, 12)]);

      const result = await service.calculateOne({
        key: "k1",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "player-k1" }],
      });

      expect(result).toBeDefined();
      expect(result._tag).toBe("success");
    });
  });

  // -------------------------------------------------------------------------
  // Validator's cutoff rule: rankingDate <= June 10 of season
  // -------------------------------------------------------------------------
  describe("ranking-date cutoff", () => {
    it("queries RankingPlace with rankingDate <= June 10 of season (validator's rule)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      const spy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: 2024, players: [{ id: "p1" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
      // Positional args: (playerIds, systemId, cutoff, transaction)
      const callArgs = spy.mock.calls[0] as unknown as [string[], string, Date, unknown];
      const cutoff = callArgs[2];
      expect(cutoff.getFullYear()).toBe(2024);
      expect(cutoff.getMonth()).toBe(5); // June (0-indexed)
      expect(cutoff.getDate()).toBe(10);
    });

    it("does not query for updatePossible (validator does not either)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      const spy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] },
      ]);

      // Helper signature takes (playerIds, systemId, cutoff, transaction) only —
      // no updatePossible filter passes through.
      expect(spy.mock.calls[0]).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // min+2 fallback (validator parity)
  // -------------------------------------------------------------------------
  describe("shared-rule per-discipline fallback (getRankingProtected)", () => {
    it("defaults all components to amountOfLevels (not +2) when no RankingPlace row exists", async () => {
      // Spec clarification 2026-06-11 (FR-008, D5): ghost players capped at
      // amountOfLevels — full unification with the shared rule.
      // Previous expectation was amountOfLevels+2 = 12 (amountOfLevels=10+2).
      // New expectation: amountOfLevels = 10 (worst level, no over-shoot).
      const playerId = "player-norate-0000-0000-0000-000000000000";

      jest
        .spyOn(RankingSystem, "findOne")
        .mockResolvedValue(stubSystem({ amountOfLevels: 10, maxDiffLevels: 2 }));
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer(playerId)]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: playerId }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        // getRankingProtected: single=double=mix=amountOfLevels=10 (no spread violation)
        expect(result.contributingPlayers[0].single).toBe(10);
        expect(result.contributingPlayers[0].double).toBe(10);
        expect(result.contributingPlayers[0].mix).toBe(10);
      }
    });

    it("fills missing components with getRankingProtected(min+maxDiffLevels) when at least one component is rated", async () => {
      const playerId = "p1";
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer(playerId)]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([
          // single=4 only; double / mix missing
          stubPlace(playerId, 4, undefined, undefined),
        ]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: playerId }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        // min(4, 12, 12) + 2 = 6 → double and mix become 6
        expect(result.contributingPlayers[0].single).toBe(4);
        expect(result.contributingPlayers[0].double).toBe(6);
        expect(result.contributingPlayers[0].mix).toBe(6);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Sub-event derivation
  // -------------------------------------------------------------------------
  describe("type / season derivation from sub-event", () => {
    it("derives type and season from SubEventCompetition when caller omits them", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(SubEventCompetition, "findAll")
        .mockResolvedValue([stubSubEvent(SubEventTypeEnum.MX, { season: 2024 })]);
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([stubPlayer("p1", "M"), stubPlayer("p2", "F")]);
      const placeSpy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 6, 6, 6), stubPlace("p2", 6, 6, 6)]);

      const result = await service.calculateOne({
        key: "k",
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1" }, { id: "p2" }],
        // type + season intentionally omitted
      });

      expect(result._tag).toBe("success");
      // Cutoff on June 10 2024 — derived from sub-event's EventCompetition.season
      const cutoff = placeSpy.mock.calls[0][2] as Date;
      expect(cutoff.getFullYear()).toBe(2024);
      expect(cutoff.getMonth()).toBe(5);
      expect(cutoff.getDate()).toBe(10);
    });

    it("returns SUB_EVENT_NOT_FOUND when subEventCompetitionId does not resolve", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);

      const result = await service.calculateOne({
        key: "k",
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("SUB_EVENT_NOT_FOUND");
      }
    });

    it("returns MISSING_TYPE_OR_SEASON when caller omits both AND no sub-event provided", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);

      const result = await service.calculateOne({
        key: "k",
        players: [{ id: "p1" }],
      });

      expect(result._tag).toBe("failure");
      if (result._tag === "failure") {
        expect(result.error.code).toBe("MISSING_TYPE_OR_SEASON");
      }
    });

    it("explicit type/season override the sub-event-derived values", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(SubEventCompetition, "findAll")
        .mockResolvedValue([stubSubEvent(SubEventTypeEnum.M, { season: 2020 })]);
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      const placeSpy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.MX,
        season: 2024,
        subEventCompetitionId: SUB_EVENT_ID,
        players: [{ id: "p1" }],
      });

      // explicit season = 2024 wins, not sub-event's 2020
      const cutoff = placeSpy.mock.calls[0][2] as Date;
      expect(cutoff.getFullYear()).toBe(2024);
    });
  });

  // -------------------------------------------------------------------------
  // System resolution
  // -------------------------------------------------------------------------
  describe("ranking system resolution", () => {
    it("uses primary system when input.systemId is omitted", async () => {
      const findOneSpy = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      const placeSpy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1" }],
      });

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { primary: true } })
      );
      // Positional args: (playerIds, systemId, cutoff, transaction)
      const systemId = placeSpy.mock.calls[0][1] as string;
      expect(systemId).toBe(SYSTEM_ID);
    });

    it("honors caller-supplied input.systemId, falling back to primary if not found", async () => {
      const otherSystem = stubSystem({ id: "other-system", primary: false });
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem()); // primary
      jest.spyOn(RankingSystem, "findAll").mockResolvedValue([otherSystem]);
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      const placeSpy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        systemId: "other-system",
        players: [{ id: "p1" }],
      });

      const systemId = placeSpy.mock.calls[0][1] as string;
      expect(systemId).toBe("other-system");
    });
  });

  // -------------------------------------------------------------------------
  // Snapshot dedupe
  // -------------------------------------------------------------------------
  describe("snapshot dedupe", () => {
    it("fetches latest places once when three inputs share the same (system, season)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([stubPlayer("p1"), stubPlayer("p2"), stubPlayer("p3")]);
      const spy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculate([
        { key: "k1", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] },
        { key: "k2", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p2" }] },
        { key: "k3", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p3" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
      const playerIds = spy.mock.calls[0][0] as string[];
      expect(playerIds).toEqual(expect.arrayContaining(["p1", "p2", "p3"]));
    });

    it("fetches latest places once per unique season when inputs span two seasons", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1"), stubPlayer("p2")]);
      const spy = jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculate([
        { key: "k1", type: SubEventTypeEnum.M, season: 2024, players: [{ id: "p1" }] },
        { key: "k2", type: SubEventTypeEnum.M, season: 2025, players: [{ id: "p2" }] },
      ]);

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // fetchPlaceMap: maps the DB-deduped latest place per player
  // (DISTINCT ON is performed at the SQL layer; the service maps row -> player.)
  // -------------------------------------------------------------------------
  describe("fetchPlaceMap mapping", () => {
    it("maps the single (most-recent) row per player into the place map", async () => {
      const playerId = "player-dedup-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer(playerId)]);

      // DB-side DISTINCT ON returns exactly one row per player.
      const newer = stubPlace(playerId, 4, 4, 4, new Date(SEASON, 5, 5)); // June 5
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([newer]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: playerId }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.contributingPlayers[0].single).toBe(4);
        expect(result.contributingPlayers[0].double).toBe(4);
      }
    });
  });

  // -------------------------------------------------------------------------
  // PLAYER_NOT_FOUND
  // -------------------------------------------------------------------------
  describe("partial failure does not fail the batch", () => {
    it("returns Success for input[0] and PLAYER_NOT_FOUND for input[1]", async () => {
      const goodId = "player-good-0000-0000-0000-000000000000";
      const badId = "player-bad--0000-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      // Only goodId is in the DB — badId is absent.
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer(goodId)]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace(goodId, 8, 8, 8)]);

      const results = await service.calculate([
        { key: "good", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: goodId }] },
        { key: "bad", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: badId }] },
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

  describe("resolveGenders", () => {
    it("does not call Player.findAll when the input player list is empty", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      const playerSpy = jest.spyOn(Player, "findAll").mockResolvedValue([]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [] },
      ]);

      expect(playerSpy).not.toHaveBeenCalled();
    });

    it("succeeds (without gender filtering) when a player exists in DB but has no gender", async () => {
      const noGenderId = "player-nogender-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([{ id: noGenderId, gender: null } as unknown as Player]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: noGenderId }],
      });

      // Player exists in DB — should not be treated as missing.
      // No RankingPlace rows → defaults to amountOfLevels for all components.
      expect(result._tag).toBe("success");
    });
  });

  // -------------------------------------------------------------------------
  // missingPlayerCount
  // -------------------------------------------------------------------------
  describe("computeResult — missing-player count", () => {
    it("sets missingPlayerCount to max(0, 4 − contributingPlayers.length)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1"), stubPlayer("p2")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 8, 8, 12), stubPlace("p2", 8, 8, 12)]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1" }, { id: "p2" }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.missingPlayerCount).toBe(2);
        expect(result.contributingPlayers).toHaveLength(2);
      }
    });
  });

  // -------------------------------------------------------------------------
  // RankingPlace fetch failure tolerance
  // -------------------------------------------------------------------------
  describe("RankingPlace fetch error", () => {
    it("falls back to default-fill (capped at amountOfLevels) when the place fetch throws", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem({ amountOfLevels: 12 }));
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockRejectedValue(new Error("DB timeout"));

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1" }],
      });

      // No crash — all components default to amountOfLevels (ghost players are
      // capped at the worst level per FR-008, clarification 2026-06-11).
      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        expect(result.contributingPlayers[0].single).toBe(12);
      }
    });
  });

  // -------------------------------------------------------------------------
  // End-to-end parity with validator on a representative case
  // -------------------------------------------------------------------------
  describe("validator parity", () => {
    it("M team, 4 ranked players: matches validator's baseIndex computation", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([
          stubPlayer("p1"),
          stubPlayer("p2"),
          stubPlayer("p3"),
          stubPlayer("p4"),
        ]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([
          stubPlace("p1", 5, 5, 7),
          stubPlace("p2", 6, 6, 8),
          stubPlace("p3", 7, 7, 9),
          stubPlace("p4", 8, 8, 10),
        ]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
      });

      expect(result._tag).toBe("success");
      // (5+5)+(6+6)+(7+7)+(8+8) = 52 — same as the validator's M-team baseIndex test.
      if (result._tag === "success") {
        expect(result.index).toBe(52);
      }
    });

    it("M team, one unranked player: falls back to amountOfLevels (capped)", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest
        .spyOn(Player, "findAll")
        .mockResolvedValue([
          stubPlayer("p1"),
          stubPlayer("p2"),
          stubPlayer("p3"),
          stubPlayer("p4"),
        ]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([
          stubPlace("p1", 5, 5, 7),
          stubPlace("p2", 6, 6, 8),
          stubPlace("p3", 7, 7, 9),
          // p4: no row
        ]);

      const result = await service.calculateOne({
        key: "k",
        type: SubEventTypeEnum.M,
        season: SEASON,
        players: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
      });

      expect(result._tag).toBe("success");
      if (result._tag === "success") {
        // Unranked p4 contributes 12+12 (capped at amountOfLevels, FR-008):
        // (5+5)+(6+6)+(7+7)+12+12 = 60 — was 64 under the abandoned uncapped +2 rule.
        expect(result.index).toBe(60);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Caller-tag log enrichment (spec FR-008, SC-004)
  // T017, T018, T019, T020
  // -------------------------------------------------------------------------
  describe("caller-tag log enrichment (FR-008)", () => {
    // T017 — WARN log includes [CallerTag] when slow (duration > 1000 ms)
    it("includes [CallerTag] in WARN log line when duration exceeds 1000 ms", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 5, 5, 7)]);

      // Simulate a slow execution by making Date.now() return values 1500 ms apart
      const nowSpy = jest.spyOn(Date, "now");
      nowSpy.mockReturnValueOnce(0).mockReturnValue(1500);

      const warnSpy = jest.spyOn(service["logger"], "warn");

      await service.calculate(
        [{ key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] }],
        { caller: "TestCaller" }
      );

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[TestCaller]"));
    });

    // T018 — DEBUG log includes [CallerTag] when fast (duration <= 1000 ms)
    it("includes [CallerTag] in DEBUG log line when duration is within normal range", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 5, 5, 7)]);

      // Fast execution — both Date.now() calls return 0 → duration = 0 ms
      jest.spyOn(Date, "now").mockReturnValue(0);

      const debugSpy = jest.spyOn(service["logger"], "debug");

      await service.calculate(
        [{ key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] }],
        { caller: "TestCaller" }
      );

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("[TestCaller]"));
    });

    // T019 — log lines do NOT include a bracketed tag when caller is omitted
    it("renders log lines WITHOUT a bracketed tag when options.caller is omitted", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 5, 5, 7)]);

      jest.spyOn(Date, "now").mockReturnValue(0);

      const debugSpy = jest.spyOn(service["logger"], "debug");

      await service.calculate([
        { key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] },
      ]);

      expect(debugSpy).toHaveBeenCalledWith(expect.not.stringContaining("["));
    });

    // T020 — calculateOne forwards caller to the underlying calculate invocation
    it("calculateOne forwards caller option to calculate so the log tag appears", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([stubPlayer("p1")]);
      jest
        .spyOn(
          service as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockResolvedValue([stubPlace("p1", 5, 5, 7)]);

      jest.spyOn(Date, "now").mockReturnValue(0);

      const debugSpy = jest.spyOn(service["logger"], "debug");

      await service.calculateOne(
        { key: "k", type: SubEventTypeEnum.M, season: SEASON, players: [{ id: "p1" }] },
        { caller: "SingleCaller" }
      );

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("[SingleCaller]"));
    });
  });
});
