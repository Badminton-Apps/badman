import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ClubPlayerMembership, Player } from "@badman/backend-database";
import { ClubPlayerMembershipsResolver } from "./club-membership.resolver";

describe("ClubPlayerMembershipsResolver", () => {
  let resolver: ClubPlayerMembershipsResolver;

  const buildUser = (allowed: boolean) =>
    ({ id: "user-uuid", hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClubPlayerMembershipsResolver],
    }).compile();

    resolver = module.get<ClubPlayerMembershipsResolver>(ClubPlayerMembershipsResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("clubPlayerMemberships (query)", () => {
    it("throws UnauthorizedException when user lacks change:transfer permission", async () => {
      await expect(resolver.clubPlayerMemberships(buildUser(false), {} as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws UnauthorizedException when user is null", async () => {
      await expect(resolver.clubPlayerMemberships(null as any, {} as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("returns paged memberships when user has change:transfer permission", async () => {
      const result = {
        count: 2,
        rows: [{ id: "m1" }, { id: "m2" }],
      } as unknown as { count: number; rows: ClubPlayerMembership[] };
      jest.spyOn(ClubPlayerMembership, "findAndCountAll").mockResolvedValue(result as any);
      const response = await resolver.clubPlayerMemberships(buildUser(true), {} as any);
      expect(response).toBe(result);
    });
  });
});
