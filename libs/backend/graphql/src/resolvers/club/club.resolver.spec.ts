import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { FindOptions, Op } from "sequelize";
import {
  Club,
  ClubPlayerMembership,
  ClubPlayerMembershipNewInput,
  ClubPlayerMembershipUpdateInput,
  ClubUpdateInput,
  Player,
} from "@badman/backend-database";
import { ErrorCode } from "../../utils";
import { ClubsResolver } from "./club.resolver";
import { ClubMembershipFilterInput } from "./club-membership-filter.input";
import { ClubMembershipService } from "./club-membership.service";

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

  const CLUB_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const PLAYER_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  const fakeClub = (id = CLUB_UUID) => ({ id }) as unknown as Club;

  const fakePlayer = (id = PLAYER_UUID) => ({ id }) as unknown as Player;

  const baseAddInput = (
    overrides: Partial<ClubPlayerMembershipNewInput> = {}
  ): ClubPlayerMembershipNewInput =>
    ({
      clubId: CLUB_UUID,
      playerId: PLAYER_UUID,
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
        ClubMembershipService,
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
  // players() — nested where filter (005)
  // ---------------------------------------------------------------------------

  describe("players()", () => {
    const makeListArgs = (whereOverride?: Record<string, unknown>) => ({
      skip: undefined,
      take: undefined,
      where: whereOverride,
      order: undefined,
    });

    function setupFakeClub(resolvedPlayers: unknown[] = []) {
      let capturedOptions: FindOptions;
      const club = { getPlayers: jest.fn() } as unknown as Club;
      jest.spyOn(Club, "findByPk").mockResolvedValue(club);
      (club.getPlayers as jest.Mock).mockImplementation((opts: FindOptions) => {
        capturedOptions = opts;
        return Promise.resolve(resolvedPlayers);
      });
      return {
        fakeClub: club,
        getOptions: () => capturedOptions,
      };
    }

    it("omitted clubMembership preserves legacy confirmed=true filter", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);

      await resolver.players(fakeClub, makeListArgs() as never, true, undefined);

      const opts = getOptions();
      const confirmedKey = `$${ClubPlayerMembership.name}.confirmed$`;
      expect((opts.where as Record<string, unknown>)[confirmedKey]).toBe(true);
    });

    it("clubMembership: {} opts in (LEFT JOIN, no implicit confirmed)", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);
      const filter: ClubMembershipFilterInput = {};

      await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      const opts = getOptions();
      const confirmedKey = `$${ClubPlayerMembership.name}.confirmed$`;
      const whereObj = (opts.where as Record<string, unknown>) ?? {};
      expect(whereObj[confirmedKey]).toBeUndefined();
      const includes = opts.include as unknown[];
      expect(includes).toBeDefined();
      const membershipInclude = (includes as Array<Record<string, unknown>>).find(
        (i) => i["as"] === "ClubPlayerMembership"
      );
      expect(membershipInclude).toBeDefined();
      expect(membershipInclude!["required"]).toBe(false);
    });

    it("LOAN + season window returns matching memberships including unconfirmed", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);
      const startBefore = new Date("2026-04-30");
      const endAfter = new Date("2025-09-01");
      const filter: ClubMembershipFilterInput = {
        membershipType: ["LOAN"],
        startBefore,
        endAfter,
      };

      await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      const opts = getOptions();
      const includes = opts.include as Array<Record<string, unknown>>;
      const membershipInclude = includes.find((i) => i["as"] === "ClubPlayerMembership");
      expect(membershipInclude).toBeDefined();
      expect(membershipInclude!["required"]).toBe(true);
      const where = membershipInclude!["where"] as Record<string, unknown>;
      expect(where["membershipType"]).toEqual({ [Op.in]: ["LOAN"] });
      expect(where["start"]).toEqual({ [Op.lte]: startBefore });
      expect(where["end"]).toEqual({ [Op.gte]: endAfter });
      const confirmedKey = `$${ClubPlayerMembership.name}.confirmed$`;
      const whereObj = (opts.where as Record<string, unknown>) ?? {};
      expect(whereObj[confirmedKey]).toBeUndefined();
    });

    it("empty result is not an error", async () => {
      const { fakeClub } = setupFakeClub([]);
      const filter: ClubMembershipFilterInput = {
        membershipType: ["LOAN"],
        startBefore: new Date("2026-04-30"),
        endAfter: new Date("2025-09-01"),
      };

      const result = await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      expect(result).toEqual([]);
    });

    it("NORMAL + confirmed:false + season window returns transfers", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);
      const startBefore = new Date("2026-04-30");
      const endAfter = new Date("2025-09-01");
      const filter: ClubMembershipFilterInput = {
        membershipType: ["NORMAL"],
        confirmed: false,
        startBefore,
        endAfter,
      };

      await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      const opts = getOptions();
      const includes = opts.include as Array<Record<string, unknown>>;
      const membershipInclude = includes.find((i) => i["as"] === "ClubPlayerMembership");
      expect(membershipInclude).toBeDefined();
      const where = membershipInclude!["where"] as Record<string, unknown>;
      expect(where["membershipType"]).toEqual({ [Op.in]: ["NORMAL"] });
      expect(where["confirmed"]).toBe(false);
      expect(where["start"]).toEqual({ [Op.lte]: startBefore });
      expect(where["end"]).toEqual({ [Op.gte]: endAfter });
      const confirmedKey = `$${ClubPlayerMembership.name}.confirmed$`;
      const whereObj = (opts.where as Record<string, unknown>) ?? {};
      expect(whereObj[confirmedKey]).toBeUndefined();
    });

    it("explicit confirmed: false does not inject legacy filter", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);
      const filter: ClubMembershipFilterInput = { confirmed: false };

      await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      const opts = getOptions();
      const includes = opts.include as Array<Record<string, unknown>>;
      const membershipInclude = includes.find((i) => i["as"] === "ClubPlayerMembership");
      expect(membershipInclude).toBeDefined();
      const where = membershipInclude!["where"] as Record<string, unknown>;
      expect(where["confirmed"]).toBe(false);
      const confirmedKey = `$${ClubPlayerMembership.name}.confirmed$`;
      const whereObj = (opts.where as Record<string, unknown>) ?? {};
      expect(whereObj[confirmedKey]).toBeUndefined();
    });

    it("empty id array short-circuits to empty result", async () => {
      const { fakeClub } = setupFakeClub([]);
      const filter: ClubMembershipFilterInput = { id: [] };

      const result = await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      expect(result).toEqual([]);
      expect(fakeClub.getPlayers).not.toHaveBeenCalled();
    });

    it("membership filter composes with player-level where", async () => {
      const { fakeClub, getOptions } = setupFakeClub([]);
      const filter: ClubMembershipFilterInput = { membershipType: ["LOAN"] };
      const listArgsWithWhere = makeListArgs({ firstName: { [Op.eq]: "Anna" } });

      await resolver.players(fakeClub, listArgsWithWhere as never, true, filter);

      const opts = getOptions();
      expect(opts.where).toMatchObject({ firstName: { [Op.eq]: "Anna" } });
      const includes = opts.include as Array<Record<string, unknown>>;
      const membershipInclude = includes.find((i) => i["as"] === "ClubPlayerMembership");
      expect(membershipInclude).toBeDefined();
      const where = membershipInclude!["where"] as Record<string, unknown>;
      expect(where["membershipType"]).toEqual({ [Op.in]: ["LOAN"] });
    });

    it("single-query: getPlayers called once for 50-row result", async () => {
      const fiftyPlayers = Array.from({ length: 50 }, (_, i) => ({ id: `player-${i}` }));
      const { fakeClub } = setupFakeClub(fiftyPlayers as unknown[]);
      const filter: ClubMembershipFilterInput = { membershipType: ["NORMAL"] };

      await resolver.players(fakeClub, makeListArgs() as never, true, filter);

      expect(fakeClub.getPlayers).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // BAD_USER_INPUT — UUID validation (014)
  // ---------------------------------------------------------------------------

  describe("removeClub — UUID validation", () => {
    it("throws BAD_USER_INPUT and logs warn when id is not a UUID", async () => {
      const user = userWithPermission(true);
      const warnSpy = jest.spyOn(Logger.prototype, "warn");

      try {
        await resolver.removeClub(user, "smash-for-fun");
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
        expect(e.extensions["field"]).toBe("id");
        expect(e.extensions["value"]).toBe("smash-for-fun");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: ErrorCode.BAD_USER_INPUT, field: "id" })
      );
    });
  });

  describe("updateClub — UUID validation", () => {
    it("throws BAD_USER_INPUT and logs warn when updateClubData.id is not a UUID", async () => {
      const user = userWithPermission(true);
      const warnSpy = jest.spyOn(Logger.prototype, "warn");

      const input = { id: "smash-for-fun" } as ClubUpdateInput;
      try {
        await resolver.updateClub(user, input);
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
        expect(e.extensions["field"]).toBe("id");
        expect(e.extensions["value"]).toBe("smash-for-fun");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: ErrorCode.BAD_USER_INPUT, field: "id" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // addPlayerToClub — 5 cases (004)
  // ---------------------------------------------------------------------------

  describe("addPlayerToClub", () => {
    it("throws BAD_USER_INPUT and logs warn when clubId is not a UUID", async () => {
      const user = userWithPermission(true);
      const warnSpy = jest.spyOn(Logger.prototype, "warn");

      try {
        await resolver.addPlayerToClub(user, baseAddInput({ clubId: "smash-for-fun" }));
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
        expect(e.extensions["field"]).toBe("clubId");
        expect(e.extensions["value"]).toBe("smash-for-fun");
      }

      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: ErrorCode.BAD_USER_INPUT, field: "clubId" })
      );
    });

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

    it("throws CLUB_NOT_FOUND when club is missing (UUID not in DB)", async () => {
      const user = userWithPermission(true);
      const missingUUID = "00000000-0000-0000-0000-000000000000";
      jest.spyOn(Club, "findByPk").mockResolvedValue(null);

      try {
        await resolver.addPlayerToClub(user, baseAddInput({ clubId: missingUUID }));
        fail("expected throw");
      } catch (err) {
        const e = err as GraphQLError;
        expect(e).toBeInstanceOf(GraphQLError);
        expect(e.extensions["code"]).toBe("CLUB_NOT_FOUND");
        expect(e.extensions["clubId"]).toBe(missingUUID);
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
      expect(result.clubId).toBe(CLUB_UUID);
      expect(result.playerId).toBe(PLAYER_UUID);
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
  // updateClubPlayerMembership — 4 cases (004)
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

      await expect(resolver.updateClubPlayerMembership(user, baseUpdateInput())).rejects.toThrow(
        "boom"
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // removePlayerFromClub — 4 cases (004)
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
