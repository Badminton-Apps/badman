import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import {
  Game,
  Player,
  RankingGroup,
  SubEventCompetition,
  SubEventTournament,
} from "@badman/backend-database";
import { PointsService } from "@badman/backend-ranking";
import { RankingGroupsResolver } from "./rankingSystemGroup.resolver";

describe("RankingGroupsResolver", () => {
  let resolver: RankingGroupsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockPointsService: { createRankingPointforGame: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockPointsService = { createRankingPointforGame: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingGroupsResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    resolver = module.get<RankingGroupsResolver>(RankingGroupsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("rankingGroup (query)", () => {
    it("returns ranking group by id", async () => {
      const fakeGroup = { id: "rg-uuid" } as unknown as RankingGroup;
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(fakeGroup);
      expect(await resolver.rankingGroup("rg-uuid")).toBe(fakeGroup);
    });

    it("throws NotFoundException when group not found", async () => {
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(null);
      await expect(resolver.rankingGroup("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("rankingGroups (query)", () => {
    it("returns list of ranking groups", async () => {
      const list = [{ id: "rg1" }] as unknown as RankingGroup[];
      jest.spyOn(RankingGroup, "findAll").mockResolvedValue(list);
      expect(await resolver.rankingGroups({} as any)).toEqual(list);
    });
  });

  describe("addSubEventsToRankingGroup (mutation)", () => {
    it("throws UnauthorizedException when user lacks add:event permission", async () => {
      await expect(
        resolver.addSubEventsToRankingGroup(buildUser(false), "rg-uuid", [], [])
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when ranking group not found", async () => {
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.addSubEventsToRankingGroup(buildUser(true), "missing", [], [])
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("adds sub-events and commits on success", async () => {
      const fakeGroup = {
        id: "rg-uuid",
        addSubEventCompetitions: jest.fn().mockResolvedValue(undefined),
        addSubEventTournaments: jest.fn().mockResolvedValue(undefined),
        getRankingSystems: jest.fn().mockResolvedValue([]),
      } as unknown as RankingGroup;
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(fakeGroup);

      jest.spyOn(Game, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventTournament, "findAll").mockResolvedValue([]);

      const result = await resolver.addSubEventsToRankingGroup(
        buildUser(true),
        "rg-uuid",
        ["comp-1"],
        ["tourn-1"]
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeGroup);
    });

    it("rolls back on error", async () => {
      const fakeGroup = {
        id: "rg-uuid",
        addSubEventCompetitions: jest.fn().mockRejectedValue(new Error("db fail")),
      } as unknown as RankingGroup;
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(fakeGroup);
      await expect(
        resolver.addSubEventsToRankingGroup(buildUser(true), "rg-uuid", ["comp-1"], [])
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("removeSubEventsToRankingGroup (mutation)", () => {
    it("throws UnauthorizedException when user lacks remove:event permission", async () => {
      await expect(
        resolver.removeSubEventsToRankingGroup(buildUser(false), "rg-uuid", [], [])
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when ranking group not found", async () => {
      jest.spyOn(RankingGroup, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.removeSubEventsToRankingGroup(buildUser(true), "missing", [], [])
      ).rejects.toThrow(NotFoundException);
    });
  });
});
