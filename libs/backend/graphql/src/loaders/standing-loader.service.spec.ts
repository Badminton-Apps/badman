import { Standing } from "@badman/backend-database";
import { Op } from "sequelize";
import { StandingLoaderService } from "./standing-loader.service";

describe("StandingLoaderService", () => {
  let service: StandingLoaderService;

  beforeEach(() => {
    service = new StandingLoaderService();
  });

  afterEach(() => jest.restoreAllMocks());

  describe("batches N ids into one findAll call", () => {
    it("issues a single Standing.findAll for multiple concurrent load calls", async () => {
      const fakeStandings = [
        { id: "s1", entryId: "entry-1" } as unknown as Standing,
        { id: "s2", entryId: "entry-2" } as unknown as Standing,
        { id: "s3", entryId: "entry-3" } as unknown as Standing,
      ];
      const findAllSpy = jest.spyOn(Standing, "findAll").mockResolvedValue(fakeStandings as never);

      const results = await Promise.all([
        service.load("entry-1"),
        service.load("entry-2"),
        service.load("entry-3"),
      ]);

      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(findAllSpy).toHaveBeenCalledWith({
        where: { entryId: { [Op.in]: expect.arrayContaining(["entry-1", "entry-2", "entry-3"]) } },
      });
      expect(results[0]).toBe(fakeStandings[0]);
      expect(results[1]).toBe(fakeStandings[1]);
      expect(results[2]).toBe(fakeStandings[2]);
    });
  });

  describe("missing ids resolve to null", () => {
    it("returns null for an entryId with no matching standing row", async () => {
      const fakeStandings = [{ id: "s1", entryId: "entry-1" } as unknown as Standing];
      jest.spyOn(Standing, "findAll").mockResolvedValue(fakeStandings as never);

      const results = await Promise.all([
        service.load("entry-1"),
        service.load("entry-2"), // no row for this
      ]);

      expect(results[0]).toBe(fakeStandings[0]);
      expect(results[1]).toBeNull();
    });
  });

  describe("falsy load short-circuits", () => {
    it("returns null immediately without a DB call when entryId is falsy", async () => {
      const findAllSpy = jest.spyOn(Standing, "findAll");

      const result = await service.load(undefined);

      expect(result).toBeNull();
      expect(findAllSpy).not.toHaveBeenCalled();
    });

    it("returns null immediately without a DB call when entryId is null", async () => {
      const findAllSpy = jest.spyOn(Standing, "findAll");

      const result = await service.load(null);

      expect(result).toBeNull();
      expect(findAllSpy).not.toHaveBeenCalled();
    });
  });

  describe("preserves id order regardless of DB row order", () => {
    it("returns rows aligned to input load order even if findAll returns them shuffled", async () => {
      const shuffled = [
        { id: "s3", entryId: "entry-3" } as unknown as Standing,
        { id: "s1", entryId: "entry-1" } as unknown as Standing,
        { id: "s2", entryId: "entry-2" } as unknown as Standing,
      ];
      jest.spyOn(Standing, "findAll").mockResolvedValue(shuffled as never);

      const results = await Promise.all([
        service.load("entry-1"),
        service.load("entry-2"),
        service.load("entry-3"),
      ]);

      expect((results[0] as Standing).entryId).toBe("entry-1");
      expect((results[1] as Standing).entryId).toBe("entry-2");
      expect((results[2] as Standing).entryId).toBe("entry-3");
    });
  });

  describe("batch failure rejects all callers", () => {
    it("rejects every concurrent caller when findAll throws", async () => {
      const dbError = new Error("DB connection lost");
      jest.spyOn(Standing, "findAll").mockRejectedValue(dbError);

      const results = await Promise.allSettled([service.load("entry-1"), service.load("entry-2")]);

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("rejected");
      expect((results[0] as PromiseRejectedResult).reason).toBe(dbError);
      expect((results[1] as PromiseRejectedResult).reason).toBe(dbError);
    });
  });
});
