import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import {
  Club,
  ClubPlayerMembership,
  ClubPlayerMembershipNewInput,
  ClubPlayerMembershipUpdateInput,
  Player,
} from "@badman/backend-database";
import { ClubsResolver } from "./club.resolver";

describe("ClubsResolver", () => {
  let resolver: ClubsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const fakeMembership = (overrides: Partial<ClubPlayerMembership> = {}) =>
    ({
      id: "membership-uuid",
      clubId: "club-uuid",
      playerId: "player-uuid",
      start: new Date("2025-09-01"),
      end: null,
      membershipType: "NORMAL",
      confirmed: false,
      update: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as ClubPlayerMembership;

  const fakeClub = (id = "club-uuid") => ({ id }) as unknown as Club;

  const fakePlayer = (id = "player-uuid") => ({ id }) as unknown as Player;

  const baseAddInput = (
    overrides: Partial<ClubPlayerMembershipNewInput> = {}
  ): ClubPlayerMembershipNewInput =>
    ({
      clubId: "club-uuid",
      playerId: "player-uuid",
      start: new Date("2025-09-01"),
      end: undefined,
      membershipType: "NORMAL" as never,
      ...overrides,
    }) as ClubPlayerMembershipNewInput;

  const baseUpdateInput = (
    overrides: Partial<ClubPlayerMembershipUpdateInput> = {}
  ): ClubPlayerMembershipUpdateInput =>
    ({
      id: "membership-uuid",
      membershipType: "LOAN" as never,
      ...overrides,
    }) as ClubPlayerMembershipUpdateInput;

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubsResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();
    resolver = module.get<ClubsResolver>(ClubsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // ---------------------------------------------------------------------------
  // addPlayerToClub — 5 cases
  // ---------------------------------------------------------------------------

  describe("addPlayerToClub", () => {
    it("rejects unauthorized with PERMISSION_DENIED", async () => {
      const user = userWithPermission(false);

      try {
        await resolver.addPlayerToClub(user, baseAddInput());
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("throws CLUB_NOT_FOUND when club is missing", async () => {
      const user = userWithPermission(true);
      jest.spyOn(Club, "findByPk").mockResolvedValue(null);

      try {
        await resolver.addPlayerToClub(user, baseAddInput({ clubId: "missing-club" }));
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("CLUB_NOT_FOUND");
        expect(e.extensions["clubId"]).toBe("missing-club");
      }

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("throws PLAYER_NOT_FOUND when player is missing", async () => {
      const user = userWithPermission(true);
      jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub());
      jest.spyOn(Player, "findByPk").mockResolvedValue(null);

      try {
        await resolver.addPlayerToClub(user, baseAddInput({ playerId: "missing-player" }));
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("PLAYER_NOT_FOUND");
        expect(e.extensions["playerId"]).toBe("missing-player");
      }

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("creates membership and returns alreadyExisted=false on first add", async () => {
      const user = userWithPermission(true);
      const membership = fakeMembership();
      jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub());
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer());
      jest
        .spyOn(ClubPlayerMembership, "findOrCreate")
        .mockResolvedValue([membership, true] as never);

      const result = await resolver.addPlayerToClub(user, baseAddInput());

      expect(result.alreadyExisted).toBe(false);
      expect(result.id).toBe("membership-uuid");
      expect(result.clubId).toBe("club-uuid");
      expect(result.playerId).toBe("player-uuid");
      expect(result.membershipType).toBe("NORMAL");
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("returns alreadyExisted=true on idempotent re-add", async () => {
      const user = userWithPermission(true);
      const existingMembership = fakeMembership({ id: "existing-membership-uuid" });
      jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub());
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer());
      jest
        .spyOn(ClubPlayerMembership, "findOrCreate")
        .mockResolvedValue([existingMembership, false] as never);

      const result = await resolver.addPlayerToClub(user, baseAddInput());

      expect(result.alreadyExisted).toBe(true);
      expect(result.id).toBe("existing-membership-uuid");
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateClubPlayerMembership — 4 cases
  // ---------------------------------------------------------------------------

  describe("updateClubPlayerMembership", () => {
    it("throws MEMBERSHIP_NOT_FOUND when membership is missing", async () => {
      const user = userWithPermission(true);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(null);

      try {
        await resolver.updateClubPlayerMembership(user, baseUpdateInput({ id: "missing-id" }));
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("MEMBERSHIP_NOT_FOUND");
        expect(e.extensions["membershipId"]).toBe("missing-id");
      }
    });

    it("rejects unauthorized with PERMISSION_DENIED", async () => {
      const user = userWithPermission(false);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(fakeMembership());

      try {
        await resolver.updateClubPlayerMembership(user, baseUpdateInput());
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("successful update commits transaction and returns true", async () => {
      const user = userWithPermission(true);
      const membership = fakeMembership();
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(membership);

      const result = await resolver.updateClubPlayerMembership(user, baseUpdateInput());

      expect(membership.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("rolls back when update throws", async () => {
      const user = userWithPermission(true);
      const membership = fakeMembership({
        update: jest.fn().mockRejectedValue(new Error("boom")) as never,
      } as Partial<ClubPlayerMembership>);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(membership);

      await expect(
        resolver.updateClubPlayerMembership(user, baseUpdateInput())
      ).rejects.toThrow("boom");

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // removePlayerFromClub — 4 cases
  // ---------------------------------------------------------------------------

  describe("removePlayerFromClub", () => {
    it("throws MEMBERSHIP_NOT_FOUND when membership is missing", async () => {
      const user = userWithPermission(true);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(null);

      try {
        await resolver.removePlayerFromClub(user, "missing-id");
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("MEMBERSHIP_NOT_FOUND");
        expect(e.extensions["membershipId"]).toBe("missing-id");
      }
    });

    it("rejects unauthorized with PERMISSION_DENIED", async () => {
      const user = userWithPermission(false);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(fakeMembership());

      try {
        await resolver.removePlayerFromClub(user, "membership-uuid");
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("PERMISSION_DENIED");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("successful destroy commits transaction and returns true", async () => {
      const user = userWithPermission(true);
      const membership = fakeMembership();
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(membership);

      const result = await resolver.removePlayerFromClub(user, "membership-uuid");

      expect(membership.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("rolls back when destroy throws", async () => {
      const user = userWithPermission(true);
      const membership = fakeMembership({
        destroy: jest.fn().mockRejectedValue(new Error("destroy-error")) as never,
      } as Partial<ClubPlayerMembership>);
      jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(membership);

      await expect(resolver.removePlayerFromClub(user, "membership-uuid")).rejects.toThrow(
        "destroy-error"
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
