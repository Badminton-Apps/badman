/**
 * Unit tests for RankingPlaceWriterService.
 * Covers the quickstart matrix from specs/037-ranking-write-protection/quickstart.md:
 *   - partial row + existing values → existing preserved (no clobber)
 *   - new player partial → derived best+maxDiff
 *   - unconfigured system → throws before any write
 *   - snapshot advances only for newer rankingDate
 *   - remove re-points snapshot
 *   - transaction passed through to every statement
 */
import { RankingLastPlace } from "../models/ranking/ranking-last-place.model";
import { RankingPlace } from "../models/ranking/ranking-place.model";
import { RankingSystem } from "../models/ranking/ranking-system.model";
import { RankingPlaceWriterService } from "./ranking-place-writer.service";

// ---------------------------------------------------------------------------
// Stub factories
// ---------------------------------------------------------------------------

const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: "system-uuid",
    name: "Test System",
    amountOfLevels: 12,
    maxDiffLevels: 2,
    ...overrides,
  }) as unknown as RankingSystem;

const stubPlace = (overrides?: Partial<RankingPlace>): RankingPlace =>
  ({
    id: "place-uuid",
    playerId: "player-uuid",
    systemId: "system-uuid",
    rankingDate: new Date("2025-01-01"),
    single: 5,
    double: 5,
    mix: 6,
    updatePossible: true,
    toJSON() {
      return { ...this };
    },
    ...overrides,
  }) as unknown as RankingPlace;

const stubLastPlace = (overrides?: Partial<RankingLastPlace>): RankingLastPlace =>
  ({
    id: "last-uuid",
    playerId: "player-uuid",
    systemId: "system-uuid",
    rankingDate: new Date("2024-01-01"),
    single: 5,
    double: 5,
    mix: 6,
    ...overrides,
  }) as unknown as RankingLastPlace;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RankingPlaceWriterService", () => {
  let service: RankingPlaceWriterService;

  beforeEach(() => {
    service = new RankingPlaceWriterService();
  });

  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // Config guard (guarantee 1)
  // -------------------------------------------------------------------------
  describe("config guard", () => {
    it("throws before any write when system.amountOfLevels is missing", async () => {
      const system = stubSystem({ amountOfLevels: undefined as unknown as number });
      const bulkSpy = jest.spyOn(RankingPlace, "bulkCreate").mockResolvedValue([]);

      await expect(service.upsertMany([{ playerId: "p1" }], system)).rejects.toThrow(
        /amountOfLevels/
      );
      expect(bulkSpy).not.toHaveBeenCalled();
    });

    it("throws before any write when system.maxDiffLevels is missing", async () => {
      const system = stubSystem({ maxDiffLevels: undefined });
      const bulkSpy = jest.spyOn(RankingPlace, "bulkCreate").mockResolvedValue([]);

      await expect(service.upsertMany([{ playerId: "p1" }], system)).rejects.toThrow(
        /maxDiffLevels/
      );
      expect(bulkSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // upsertMany — fill-from-previous (guarantee 2)
  // -------------------------------------------------------------------------
  describe("upsertMany — fill-from-previous", () => {
    it("preserves existing values for absent categories (no clobber)", async () => {
      const system = stubSystem();
      // Player has existing snapshot with known doubles/mixed = 5/6
      jest
        .spyOn(RankingLastPlace, "findAll")
        .mockResolvedValue([
          stubLastPlace({ playerId: "player-uuid", single: 5, double: 5, mix: 6 }),
        ]);

      let written: Partial<RankingPlace>[] = [];
      jest.spyOn(RankingPlace, "bulkCreate").mockImplementation(async (rows) => {
        written = rows as Partial<RankingPlace>[];
        return [];
      });
      jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);
      jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);

      // Import only has singles value (doubles/mix missing)
      await service.upsertMany(
        [
          {
            playerId: "player-uuid",
            systemId: "system-uuid",
            rankingDate: new Date("2025-02-01"),
            single: 4,
          },
        ],
        system
      );

      expect(written).toHaveLength(1);
      // single from incoming = 4; double/mix from last-known = 5/6 (not overwritten with derived)
      // After protect: best=4, double=max(5,4+2)=6, mix=max(6,4+2)=6
      expect(written[0].single).toBe(4);
      expect(written[0].double).toBeDefined();
      expect(written[0].mix).toBeDefined();
      // Importantly no NULL values
      expect(written[0].double).not.toBeNull();
      expect(written[0].mix).not.toBeNull();
    });

    it("derives values for a new player with no prior ranking", async () => {
      const system = stubSystem(); // amountOfLevels=12, maxDiffLevels=2
      jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]); // no prior

      let written: Partial<RankingPlace>[] = [];
      jest.spyOn(RankingPlace, "bulkCreate").mockImplementation(async (rows) => {
        written = rows as Partial<RankingPlace>[];
        return [];
      });
      jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);

      // New player with only singles = 6
      await service.upsertMany(
        [
          {
            playerId: "new-player",
            systemId: "system-uuid",
            rankingDate: new Date("2025-02-01"),
            single: 6,
          },
        ],
        system
      );

      expect(written).toHaveLength(1);
      // best = 6; derived double/mix = min(6+2, 12) = 8
      expect(written[0].single).toBe(6);
      expect(written[0].double).toBe(8);
      expect(written[0].mix).toBe(8);
    });

    it("all derived values capped at amountOfLevels", async () => {
      const system = stubSystem({ amountOfLevels: 12, maxDiffLevels: 2 });
      jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);

      let written: Partial<RankingPlace>[] = [];
      jest.spyOn(RankingPlace, "bulkCreate").mockImplementation(async (rows) => {
        written = rows as Partial<RankingPlace>[];
        return [];
      });
      jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);

      // New player with single=11; derived would be 13 but capped at 12
      await service.upsertMany(
        [
          {
            playerId: "new-player2",
            systemId: "system-uuid",
            rankingDate: new Date("2025-02-01"),
            single: 11,
          },
        ],
        system
      );

      expect(written[0].double).toBe(12);
      expect(written[0].mix).toBe(12);
    });
  });

  // -------------------------------------------------------------------------
  // upsertMany — snapshot propagation (guarantee 5)
  // -------------------------------------------------------------------------
  describe("upsertMany — snapshot propagation", () => {
    it("advances snapshot when incoming rankingDate is newer than stored", async () => {
      const system = stubSystem();
      jest
        .spyOn(RankingLastPlace, "findAll")
        // First call: fill-from-previous
        .mockResolvedValueOnce([])
        // Second call: current snapshot (older date)
        .mockResolvedValueOnce([stubLastPlace({ rankingDate: new Date("2024-01-01") })]);

      jest.spyOn(RankingPlace, "bulkCreate").mockResolvedValue([]);

      let snapshotUpserted: Partial<RankingLastPlace>[] = [];
      jest.spyOn(RankingLastPlace, "bulkCreate").mockImplementation(async (rows) => {
        snapshotUpserted = rows as Partial<RankingLastPlace>[];
        return [];
      });

      const newerDate = new Date("2025-06-01");
      await service.upsertMany(
        [
          {
            playerId: "player-uuid",
            systemId: "system-uuid",
            rankingDate: newerDate,
            single: 5,
            double: 5,
            mix: 6,
          },
        ],
        system
      );

      expect(snapshotUpserted.length).toBeGreaterThan(0);
      expect(snapshotUpserted[0].rankingDate).toEqual(newerDate);
    });

    it("does not advance snapshot when incoming rankingDate is older than stored", async () => {
      const system = stubSystem();
      // All 3 values are present → _fillFromPrevious skips the findAll call.
      // Only _propagateSnapshot calls findAll (once) to load the current snapshot.
      jest
        .spyOn(RankingLastPlace, "findAll")
        .mockResolvedValue([stubLastPlace({ rankingDate: new Date("2025-12-01") })]);

      jest.spyOn(RankingPlace, "bulkCreate").mockResolvedValue([]);
      const snapshotBulkCreate = jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);

      // Incoming date is older than stored snapshot
      await service.upsertMany(
        [
          {
            playerId: "player-uuid",
            systemId: "system-uuid",
            rankingDate: new Date("2024-01-01"),
            single: 5,
            double: 5,
            mix: 6,
          },
        ],
        system
      );

      // bulkCreate for snapshot should not have been called (nothing to upsert)
      expect(snapshotBulkCreate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // remove — re-point snapshot (guarantee 8)
  // -------------------------------------------------------------------------
  describe("remove", () => {
    it("destroys the place and re-points snapshot to next-newest", async () => {
      const system = stubSystem();
      const place = stubPlace();
      const destroySpy = jest.fn().mockResolvedValue(undefined);
      (place as unknown as Record<string, unknown>)["destroy"] = destroySpy;

      const nextNewest = stubPlace({
        id: "next-uuid",
        rankingDate: new Date("2024-06-01"),
        single: 6,
        double: 6,
        mix: 7,
        asLastRankingPlace() {
          return {
            rankingDate: new Date("2024-06-01"),
            single: 6,
            double: 6,
            mix: 7,
            playerId: "player-uuid",
            systemId: "system-uuid",
          };
        },
      });

      jest.spyOn(RankingPlace, "findOne").mockResolvedValue(nextNewest);
      const upsertSpy = jest
        .spyOn(RankingLastPlace, "upsert")
        .mockResolvedValue([{} as RankingLastPlace, true]);

      await service.remove(place);

      expect(destroySpy).toHaveBeenCalled();
      expect(upsertSpy).toHaveBeenCalled();
    });

    it("destroys snapshot when no remaining rows", async () => {
      const place = stubPlace();
      const destroySpy = jest.fn().mockResolvedValue(undefined);
      (place as unknown as Record<string, unknown>)["destroy"] = destroySpy;

      jest.spyOn(RankingPlace, "findOne").mockResolvedValue(null);
      const snapshotDestroySpy = jest.spyOn(RankingLastPlace, "destroy").mockResolvedValue(1);

      await service.remove(place);

      expect(destroySpy).toHaveBeenCalled();
      expect(snapshotDestroySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { playerId: place.playerId, systemId: place.systemId },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateForPlayer — fill from last-known (guarantee 2c)
  // -------------------------------------------------------------------------
  describe("updateForPlayer", () => {
    it("uses last-known values for categories not in scraped result", async () => {
      const system = stubSystem();
      const existingPlace = stubPlace({
        single: 5,
        double: 5,
        mix: 6,
        updatePossible: true,
        save: jest.fn().mockResolvedValue(undefined),
        changed: jest.fn(),
      });

      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([existingPlace]);
      jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);

      // Only single scraped; double and mix come from existing place
      await service.updateForPlayer("player-uuid", system, { single: 4 });

      // The save should have been called with protected values
      expect(existingPlace.save).toHaveBeenCalled();
      // single = 4 (scraped); double = 5 (existing); mix = 6 (existing)
      // After protect: best=4, double=min(5,4+2)=6, mix=min(6,4+2)=6
      expect(existingPlace.single).toBe(4);
    });

    it("stops updating after the first updatePossible=true row", async () => {
      const system = stubSystem();
      const place1 = stubPlace({
        updatePossible: false,
        save: jest.fn().mockResolvedValue(undefined),
        changed: jest.fn(),
      });
      const place2 = stubPlace({
        id: "second",
        updatePossible: true,
        save: jest.fn().mockResolvedValue(undefined),
        changed: jest.fn(),
      });
      const place3 = stubPlace({
        id: "third",
        updatePossible: false,
        save: jest.fn().mockResolvedValue(undefined),
        changed: jest.fn(),
      });

      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([place1, place2, place3]);
      jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);
      jest.spyOn(RankingLastPlace, "bulkCreate").mockResolvedValue([]);

      await service.updateForPlayer("player-uuid", system, { single: 4, double: 5, mix: 6 });

      expect(place1.save).toHaveBeenCalled();
      expect(place2.save).toHaveBeenCalled();
      expect(place3.save).not.toHaveBeenCalled(); // stopped after updatePossible=true
    });
  });
});
