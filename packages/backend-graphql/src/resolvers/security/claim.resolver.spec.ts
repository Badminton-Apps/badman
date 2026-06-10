import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Claim, Player } from "@badman/backend-database";
import { ClaimResolver } from "./claim.resolver";

describe("ClaimResolver", () => {
  let resolver: ClaimResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<ClaimResolver>(ClaimResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("claim (query)", () => {
    it("returns claim by id", async () => {
      const fakeClaim = { id: "c-uuid" } as unknown as Claim;
      jest.spyOn(Claim, "findByPk").mockResolvedValue(fakeClaim);
      expect(await resolver.claim("c-uuid")).toBe(fakeClaim);
    });

    it("throws NotFoundException when claim not found", async () => {
      jest.spyOn(Claim, "findByPk").mockResolvedValue(null);
      await expect(resolver.claim("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("claims (query)", () => {
    it("returns list of claims", async () => {
      const list = [{ id: "c1" }, { id: "c2" }] as unknown as Claim[];
      jest.spyOn(Claim, "findAll").mockResolvedValue(list);
      expect(await resolver.claims({} as any)).toEqual(list);
    });

    it("returns empty array when no claims exist", async () => {
      jest.spyOn(Claim, "findAll").mockResolvedValue([]);
      expect(await resolver.claims({} as any)).toEqual([]);
    });
  });

  describe("assignClaim (mutation)", () => {
    it("throws UnauthorizedException when user lacks permission", async () => {
      await expect(
        resolver.assignClaim(buildUser(false), "c-uuid", "p-uuid", true)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when player not found", async () => {
      jest.spyOn(Player, "findByPk").mockResolvedValue(null);
      await expect(resolver.assignClaim(buildUser(true), "c-uuid", "p-uuid", true)).rejects.toThrow(
        NotFoundException
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("adds claim and commits on success", async () => {
      const fakePlayer = { addClaim: jest.fn().mockResolvedValue(undefined) } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      const result = await resolver.assignClaim(buildUser(true), "c-uuid", "p-uuid", true);
      expect(fakePlayer.addClaim).toHaveBeenCalledWith("c-uuid", { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("removes claim when active=false", async () => {
      const fakePlayer = {
        removeClaim: jest.fn().mockResolvedValue(undefined),
      } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      await resolver.assignClaim(buildUser(true), "c-uuid", "p-uuid", false);
      expect(fakePlayer.removeClaim).toHaveBeenCalledWith("c-uuid", {
        transaction: mockTransaction,
      });
    });

    it("rolls back on error", async () => {
      const fakePlayer = {
        addClaim: jest.fn().mockRejectedValue(new Error("db fail")),
      } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      await expect(resolver.assignClaim(buildUser(true), "c-uuid", "p-uuid", true)).rejects.toThrow(
        "db fail"
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe("assignClaims (mutation)", () => {
    it("throws UnauthorizedException when user lacks permission", async () => {
      await expect(resolver.assignClaims(buildUser(false), [])).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when a player in the list is not found", async () => {
      jest.spyOn(Player, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.assignClaims(buildUser(true), [
          { playerId: "p-uuid", claimId: "c-uuid", active: true },
        ])
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("processes all claims and commits on success", async () => {
      const fakePlayer = {
        addClaim: jest.fn().mockResolvedValue(undefined),
        removeClaim: jest.fn().mockResolvedValue(undefined),
      } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      const result = await resolver.assignClaims(buildUser(true), [
        { playerId: "p1", claimId: "c1", active: true },
        { playerId: "p2", claimId: "c2", active: false },
      ]);
      expect(result).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it("rolls back on error during processing", async () => {
      const fakePlayer = {
        addClaim: jest.fn().mockRejectedValue(new Error("bulk fail")),
      } as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      await expect(
        resolver.assignClaims(buildUser(true), [{ playerId: "p1", claimId: "c1", active: true }])
      ).rejects.toThrow("bulk fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
