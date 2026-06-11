import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import {
  Player,
  RankingPlace,
  RankingPlaceWriterService,
  RankingSystem,
} from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { RankingPlaceResolver } from "./rankingPlace.resolver";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubSystem = (id = "s1"): RankingSystem =>
  ({ id, amountOfLevels: 12, maxDiffLevels: 2 }) as unknown as RankingSystem;

const stubPlace = (overrides?: Partial<RankingPlace>): RankingPlace =>
  ({
    id: "place-1",
    systemId: "s1",
    playerId: "player-1",
    rankingDate: new Date("2025-01-01"),
    single: 5,
    double: 5,
    mix: 6,
    toJSON() {
      return { ...this };
    },
    ...overrides,
  }) as unknown as RankingPlace;

const stubUser = (canEdit = true): Player =>
  ({ hasAnyPermission: jest.fn().mockResolvedValue(canEdit) }) as unknown as Player;

describe("RankingPlaceResolver", () => {
  let resolver: RankingPlaceResolver;
  let rankingSystemService: { getById: jest.Mock };
  let writer: {
    upsertOne: jest.Mock;
    remove: jest.Mock;
    upsertMany: jest.Mock;
    updateForPlayer: jest.Mock;
  };
  let sequelize: { transaction: jest.Mock };

  const mockCommit = jest.fn();
  const mockRollback = jest.fn();

  beforeEach(async () => {
    mockCommit.mockReset();
    mockRollback.mockReset();

    rankingSystemService = { getById: jest.fn() };
    writer = {
      upsertOne: jest.fn(),
      remove: jest.fn(),
      upsertMany: jest.fn(),
      updateForPlayer: jest.fn(),
    };
    sequelize = {
      transaction: jest.fn().mockResolvedValue({ commit: mockCommit, rollback: mockRollback }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingPlaceResolver,
        { provide: Sequelize, useValue: sequelize },
        { provide: RankingSystemService, useValue: rankingSystemService },
        { provide: RankingPlaceWriterService, useValue: writer },
      ],
    }).compile();

    resolver = module.get<RankingPlaceResolver>(RankingPlaceResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // rankingPlace query
  // -------------------------------------------------------------------------
  describe("rankingPlace(id) query", () => {
    it("does NOT call getById when single/double/mix are all set", async () => {
      const place = stubPlace({ single: 5, double: 5, mix: 5 });
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);

      const result = await resolver.rankingPlace("p1");

      expect(result).toBe(place);
      expect(rankingSystemService.getById).not.toHaveBeenCalled();
    });

    it("calls getById when any level is null", async () => {
      const place = stubPlace({ single: undefined });
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      rankingSystemService.getById.mockResolvedValue(stubSystem());

      await resolver.rankingPlace("p1");

      expect(rankingSystemService.getById).toHaveBeenCalledWith("s1");
    });

    it("throws NotFoundException when place not found", async () => {
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(null);
      await expect(resolver.rankingPlace("missing")).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when getById returns null for missing level", async () => {
      const place = stubPlace({ single: undefined });
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      rankingSystemService.getById.mockResolvedValue(null);

      await expect(resolver.rankingPlace("p1")).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // updateRankingPlace mutation
  // -------------------------------------------------------------------------
  describe("updateRankingPlace mutation", () => {
    it("rejects unauthorized users", async () => {
      const user = stubUser(false);
      await expect(
        resolver.updateRankingPlace(user, { id: "p1", playerId: "player-1" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when place not found", async () => {
      const user = stubUser(true);
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(null);

      await expect(
        resolver.updateRankingPlace(user, { id: "missing", playerId: "player-1" })
      ).rejects.toThrow(NotFoundException);
      expect(mockRollback).toHaveBeenCalled();
    });

    it("silently clamps via writer and commits transaction", async () => {
      const user = stubUser(true);
      const existing = stubPlace();
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(existing);
      rankingSystemService.getById.mockResolvedValue(stubSystem());
      const updatedPlace = stubPlace({ single: 6 });
      writer.upsertOne.mockResolvedValue(updatedPlace);

      const result = await resolver.updateRankingPlace(user, {
        id: "place-1",
        playerId: "player-1",
        single: 6,
      });

      expect(writer.upsertOne).toHaveBeenCalledWith(
        expect.objectContaining({ single: 6 }),
        expect.objectContaining({ id: "s1" }),
        expect.objectContaining({ transaction: expect.any(Object) })
      );
      expect(mockCommit).toHaveBeenCalled();
      expect(mockRollback).not.toHaveBeenCalled();
      expect(result).toBe(updatedPlace);
    });

    it("rolls back on unexpected error", async () => {
      const user = stubUser(true);
      const existing = stubPlace();
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(existing);
      rankingSystemService.getById.mockResolvedValue(stubSystem());
      writer.upsertOne.mockRejectedValue(new Error("DB error"));

      await expect(
        resolver.updateRankingPlace(user, { id: "place-1", playerId: "player-1" })
      ).rejects.toThrow("DB error");
      expect(mockRollback).toHaveBeenCalled();
      expect(mockCommit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // newRankingPlace mutation
  // -------------------------------------------------------------------------
  describe("newRankingPlace mutation", () => {
    it("rejects unauthorized users", async () => {
      const user = stubUser(false);
      await expect(resolver.newRankingPlace(user, { playerId: "player-1" })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when player not found", async () => {
      const user = stubUser(true);
      jest.spyOn(Player, "findByPk").mockResolvedValue(null);

      await expect(resolver.newRankingPlace(user, { playerId: "missing" })).rejects.toThrow(
        NotFoundException
      );
      expect(mockRollback).toHaveBeenCalled();
    });

    it("routes through writer and commits", async () => {
      const user = stubUser(true);
      const player = { id: "player-1" } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(player);
      rankingSystemService.getById.mockResolvedValue(stubSystem());
      const newPlace = stubPlace();
      writer.upsertOne.mockResolvedValue(newPlace);

      const result = await resolver.newRankingPlace(user, { playerId: "player-1", systemId: "s1" });

      expect(writer.upsertOne).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
      expect(result).toBe(newPlace);
    });
  });

  // -------------------------------------------------------------------------
  // removeRankingPlace mutation
  // -------------------------------------------------------------------------
  describe("removeRankingPlace mutation", () => {
    it("rejects unauthorized users", async () => {
      const user = stubUser(false);
      const place = stubPlace();
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);

      await expect(resolver.removeRankingPlace(user, "place-1")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when place not found", async () => {
      const user = stubUser(true);
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(null);

      await expect(resolver.removeRankingPlace(user, "missing")).rejects.toThrow(NotFoundException);
    });

    it("calls writer.remove and commits transaction", async () => {
      const user = stubUser(true);
      const place = stubPlace();
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      writer.remove.mockResolvedValue(undefined);

      const result = await resolver.removeRankingPlace(user, "place-1");

      expect(writer.remove).toHaveBeenCalledWith(
        place,
        expect.objectContaining({ transaction: expect.any(Object) })
      );
      expect(mockCommit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("rolls back on error", async () => {
      const user = stubUser(true);
      const place = stubPlace();
      jest.spyOn(RankingPlace, "findByPk").mockResolvedValue(place);
      writer.remove.mockRejectedValue(new Error("remove failed"));

      await expect(resolver.removeRankingPlace(user, "place-1")).rejects.toThrow("remove failed");
      expect(mockRollback).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // rankingSystem ResolveField
  // -------------------------------------------------------------------------
  describe("rankingSystem ResolveField", () => {
    it("calls getById with the parent systemId", async () => {
      const place = stubPlace();
      const system = stubSystem();
      rankingSystemService.getById.mockResolvedValue(system);

      const result = await resolver.rankingSystem(place);

      expect(result).toBe(system);
      expect(rankingSystemService.getById).toHaveBeenCalledWith("s1");
    });
  });
});
