import { Test, TestingModule } from "@nestjs/testing";
import { RankingSystem } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { RankingSystemService } from "./ranking-system.service";

describe("RankingSystemService", () => {
  let service: RankingSystemService;
  let debugSpy: jest.SpyInstance;

  const primarySystem = { id: "primary-id", primary: true } as unknown as RankingSystem;
  const otherSystem = { id: "other-id", primary: false } as unknown as RankingSystem;

  beforeEach(async () => {
    jest.useFakeTimers();
    debugSpy = jest.spyOn(Logger.prototype, "debug").mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RankingSystemService],
    }).compile();

    service = module.get<RankingSystemService>(RankingSystemService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("getPrimary", () => {
    it("issues one findOne on miss and returns the row", async () => {
      const findOne = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(primarySystem);

      const result = await service.getPrimary();

      expect(result).toBe(primarySystem);
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne).toHaveBeenCalledWith({ where: { primary: true } });
    });

    it("returns cached value on subsequent calls within TTL (no extra DB round trip)", async () => {
      const findOne = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(primarySystem);

      await service.getPrimary();
      await service.getPrimary();
      await service.getPrimary();

      expect(findOne).toHaveBeenCalledTimes(1);
    });

    it("re-queries after the TTL expires", async () => {
      const findOne = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(primarySystem);

      await service.getPrimary();
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await service.getPrimary();

      expect(findOne).toHaveBeenCalledTimes(2);
    });

    it("de-duplicates concurrent callers into a single DB call", async () => {
      let resolveFindOne!: (v: RankingSystem | null) => void;
      const findOne = jest.spyOn(RankingSystem, "findOne").mockReturnValue(
        new Promise((resolve) => {
          resolveFindOne = resolve;
        }) as any
      );

      const p1 = service.getPrimary();
      const p2 = service.getPrimary();
      const p3 = service.getPrimary();

      resolveFindOne(primarySystem);
      const results = await Promise.all([p1, p2, p3]);

      expect(findOne).toHaveBeenCalledTimes(1);
      expect(results).toEqual([primarySystem, primarySystem, primarySystem]);
    });

    it("caches null results too (DB returns no primary row)", async () => {
      const findOne = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(null);

      const a = await service.getPrimary();
      const b = await service.getPrimary();

      expect(a).toBeNull();
      expect(b).toBeNull();
      expect(findOne).toHaveBeenCalledTimes(1);
    });

    it("logs a debug message on miss but not on hit", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(primarySystem);

      await service.getPrimary();
      const missCallCount = debugSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("getPrimary miss")
      ).length;

      await service.getPrimary(); // hit, no new miss log
      const afterHitCount = debugSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("getPrimary miss")
      ).length;

      expect(missCallCount).toBe(1);
      expect(afterHitCount).toBe(1);
    });
  });

  describe("getById", () => {
    it("issues one findByPk on miss and caches the result", async () => {
      const findByPk = jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(otherSystem);

      const a = await service.getById("other-id");
      const b = await service.getById("other-id");

      expect(a).toBe(otherSystem);
      expect(b).toBe(otherSystem);
      expect(findByPk).toHaveBeenCalledTimes(1);
      expect(findByPk).toHaveBeenCalledWith("other-id");
    });

    it("re-queries after TTL expires", async () => {
      const findByPk = jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(otherSystem);

      await service.getById("other-id");
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await service.getById("other-id");

      expect(findByPk).toHaveBeenCalledTimes(2);
    });

    it("does NOT cache null results — next call re-queries", async () => {
      const findByPk = jest
        .spyOn(RankingSystem, "findByPk")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(otherSystem);

      const first = await service.getById("missing-id");
      const second = await service.getById("missing-id");

      expect(first).toBeNull();
      expect(second).toBe(otherSystem);
      expect(findByPk).toHaveBeenCalledTimes(2);
    });

    it("de-duplicates concurrent callers for the same id", async () => {
      let resolveFindByPk!: (v: RankingSystem | null) => void;
      const findByPk = jest.spyOn(RankingSystem, "findByPk").mockReturnValue(
        new Promise((resolve) => {
          resolveFindByPk = resolve;
        }) as any
      );

      const p1 = service.getById("other-id");
      const p2 = service.getById("other-id");

      resolveFindByPk(otherSystem);
      const results = await Promise.all([p1, p2]);

      expect(findByPk).toHaveBeenCalledTimes(1);
      expect(results).toEqual([otherSystem, otherSystem]);
    });

    it("returns null without hitting the DB when id is null/undefined/empty", async () => {
      const findByPk = jest.spyOn(RankingSystem, "findByPk");

      expect(await service.getById(null)).toBeNull();
      expect(await service.getById(undefined)).toBeNull();
      expect(await service.getById("")).toBeNull();

      expect(findByPk).not.toHaveBeenCalled();
    });

    it("keeps separate cache entries per id", async () => {
      const findByPk = jest
        .spyOn(RankingSystem, "findByPk")
        .mockImplementation(((id: string) =>
          Promise.resolve(id === "primary-id" ? primarySystem : otherSystem)) as any);

      await service.getById("primary-id");
      await service.getById("other-id");
      await service.getById("primary-id");
      await service.getById("other-id");

      expect(findByPk).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate", () => {
    it("clears the primary cache so next call re-queries", async () => {
      const findOne = jest.spyOn(RankingSystem, "findOne").mockResolvedValue(primarySystem);

      await service.getPrimary();
      service.invalidate();
      await service.getPrimary();

      expect(findOne).toHaveBeenCalledTimes(2);
    });

    it("clears the by-id cache so next call re-queries", async () => {
      const findByPk = jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(otherSystem);

      await service.getById("other-id");
      service.invalidate();
      await service.getById("other-id");

      expect(findByPk).toHaveBeenCalledTimes(2);
    });

    it("logs a debug message", () => {
      service.invalidate();
      expect(
        debugSpy.mock.calls.some(
          (call) => typeof call[0] === "string" && call[0].includes("invalidate")
        )
      ).toBe(true);
    });
  });
});
