import { Test, TestingModule } from "@nestjs/testing";
import { Sequelize } from "sequelize-typescript";
import { FindOptions, Op } from "sequelize";
import { Club, ClubPlayerMembership, Player } from "@badman/backend-database";
import { ClubsResolver } from "./club.resolver";
import { ClubMembershipFilterInput } from "./club-membership-filter.input";

describe("ClubsResolver", () => {
  let resolver: ClubsResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
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

  describe("players()", () => {
    const makeListArgs = (whereOverride?: Record<string, unknown>) => ({
      skip: undefined,
      take: undefined,
      where: whereOverride,
      order: undefined,
    });

    function setupFakeClub(resolvedPlayers: unknown[] = []) {
      let capturedOptions: FindOptions;
      const fakeClub = { getPlayers: jest.fn() } as unknown as Club;
      jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
      (fakeClub.getPlayers as jest.Mock).mockImplementation((opts: FindOptions) => {
        capturedOptions = opts;
        return Promise.resolve(resolvedPlayers);
      });
      return {
        fakeClub,
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
      // Legacy confirmed key should NOT be present — either where is undefined or doesn't have the key
      const whereObj = (opts.where as Record<string, unknown>) ?? {};
      expect(whereObj[confirmedKey]).toBeUndefined();
      // Include should be present with required: false (LEFT JOIN)
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
      // No legacy confirmed filter
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
      // Player-level where should include firstName filter
      expect(opts.where).toMatchObject({ firstName: { [Op.eq]: "Anna" } });
      // Membership include should also be present
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
});
