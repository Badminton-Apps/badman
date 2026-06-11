/**
 * Unit tests for RankingPlace clamp-only safety-net hooks.
 * These hooks guard against rogue direct writes that bypass RankingPlaceWriterService.
 */
import { RankingPlace } from "./ranking-place.model";
import { RankingSystem } from "./ranking-system.model";

const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: "system-uuid",
    name: "Test System",
    amountOfLevels: 12,
    maxDiffLevels: 2,
    ...overrides,
  }) as unknown as RankingSystem;

describe("RankingPlace clamp hooks (safety net)", () => {
  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // BeforeCreate / BeforeUpdate clamp
  // -------------------------------------------------------------------------
  describe("clampOnWrite (BeforeCreate / BeforeUpsert)", () => {
    it("clamps a rule-violating spread when system is configured", async () => {
      const system = stubSystem();
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);

      const instance = {
        systemId: "system-uuid",
        single: 4,
        double: 10, // violates: 10 - 4 = 6 > maxDiffLevels=2
        mix: 10,
      } as unknown as RankingPlace;

      await RankingPlace.clampOnWrite(instance, {});

      // After clamp: best=4, double and mix = 4+2 = 6
      expect(instance.double).toBe(6);
      expect(instance.mix).toBe(6);
      expect(instance.single).toBe(4);
    });

    it("clamps values above amountOfLevels", async () => {
      const system = stubSystem();
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);

      const instance = {
        systemId: "system-uuid",
        single: 11,
        double: 13, // above amountOfLevels=12
        mix: 14,
      } as unknown as RankingPlace;

      await RankingPlace.clampOnWrite(instance, {});

      expect(instance.single).toBe(11);
      expect(instance.double).toBe(12); // capped at amountOfLevels
      expect(instance.mix).toBe(12);
    });
  });

  describe("clampOnUpdate (BeforeUpdate)", () => {
    it("clamps on update path", async () => {
      const system = stubSystem();
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);

      const instance = {
        systemId: "system-uuid",
        single: 3,
        double: 8,
        mix: 9,
      } as unknown as RankingPlace;

      await RankingPlace.clampOnUpdate(instance, {});

      expect(instance.double).toBe(5); // 3+2
      expect(instance.mix).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // Unconfigured system → warn + no-op
  // -------------------------------------------------------------------------
  describe("unconfigured system", () => {
    it("warns + leaves values untouched when system lacks amountOfLevels", async () => {
      const unconfiguredSystem = stubSystem({ amountOfLevels: undefined as unknown as number });
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(unconfiguredSystem);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

      const instance = {
        systemId: "unconfigured-system",
        single: 3,
        double: 12,
        mix: 12,
      } as unknown as RankingPlace;

      await RankingPlace.clampOnWrite(instance, {});

      // Values unchanged because system not configured
      expect(instance.double).toBe(12);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unconfigured"));
    });

    it("warns + leaves values untouched when system is not found", async () => {
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(null);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

      const instance = {
        systemId: "missing-system",
        single: 3,
        double: 12,
        mix: 12,
      } as unknown as RankingPlace;

      await RankingPlace.clampOnWrite(instance, {});

      expect(instance.double).toBe(12);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // BeforeBulkCreate
  // -------------------------------------------------------------------------
  describe("clampOnBulkCreate", () => {
    it("clamps all instances in a bulk operation", async () => {
      const system = stubSystem();
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);

      const instances = [
        { systemId: "system-uuid", single: 4, double: 10, mix: 10 },
        { systemId: "system-uuid", single: 6, double: 6, mix: 11 },
      ] as unknown as RankingPlace[];

      await RankingPlace.clampOnBulkCreate(instances, {});

      expect(instances[0].double).toBe(6); // 4+2
      expect(instances[0].mix).toBe(6);
      expect(instances[1].mix).toBe(8); // 6+2
    });
  });
});
