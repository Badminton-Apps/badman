import { Test, TestingModule } from "@nestjs/testing";
import { ClubPlayerMembership } from "@badman/backend-database";
import { ClubMembershipType } from "@badman/utils";
import { ClubMembershipService } from "./club-membership.service";

describe("ClubMembershipService.upsertMembership", () => {
  let service: ClubMembershipService;

  const fakeTransaction = {} as never;

  const fakeMembership = (overrides: Partial<ClubPlayerMembership> = {}) =>
    ({
      id: "membership-uuid",
      clubId: "club-uuid",
      playerId: "player-uuid",
      start: new Date("2025-09-01"),
      end: null,
      membershipType: ClubMembershipType.NORMAL,
      ...overrides,
    }) as unknown as ClubPlayerMembership;

  const baseArgs = (overrides = {}) => ({
    clubId: "club-uuid",
    playerId: "player-uuid",
    start: new Date("2025-09-01"),
    end: undefined as Date | undefined,
    membershipType: ClubMembershipType.NORMAL,
    confirmed: false,
    transaction: fakeTransaction,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClubMembershipService],
    }).compile();
    service = module.get<ClubMembershipService>(ClubMembershipService);
  });

  afterEach(() => jest.restoreAllMocks());

  it("creates a new membership and returns alreadyExisted: false", async () => {
    const membership = fakeMembership();
    jest.spyOn(ClubPlayerMembership, "findOrCreate").mockResolvedValue([membership, true] as never);

    const result = await service.upsertMembership(baseArgs());

    expect(result.alreadyExisted).toBe(false);
    expect(result.id).toBe("membership-uuid");
    expect(result.clubId).toBe("club-uuid");
    expect(result.playerId).toBe("player-uuid");
    expect(result.membershipType).toBe(ClubMembershipType.NORMAL);
  });

  it("returns alreadyExisted: true when membership already exists", async () => {
    const existing = fakeMembership({ id: "existing-uuid" });
    jest.spyOn(ClubPlayerMembership, "findOrCreate").mockResolvedValue([existing, false] as never);

    const result = await service.upsertMembership(baseArgs());

    expect(result.alreadyExisted).toBe(true);
    expect(result.id).toBe("existing-uuid");
  });

  it("passes LOAN membershipType through unchanged", async () => {
    const membership = fakeMembership({ membershipType: ClubMembershipType.LOAN });
    jest.spyOn(ClubPlayerMembership, "findOrCreate").mockResolvedValue([membership, true] as never);

    const result = await service.upsertMembership(baseArgs({ membershipType: ClubMembershipType.LOAN }));

    expect(result.membershipType).toBe(ClubMembershipType.LOAN);
  });

  it("passes confirmed: true to findOrCreate defaults when caller specifies it", async () => {
    const membership = fakeMembership();
    const findOrCreate = jest
      .spyOn(ClubPlayerMembership, "findOrCreate")
      .mockResolvedValue([membership, true] as never);

    await service.upsertMembership(baseArgs({ confirmed: true }));

    expect(findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: expect.objectContaining({ confirmed: true }),
      })
    );
  });

  it("passes confirmed: false to findOrCreate defaults when caller specifies it", async () => {
    const membership = fakeMembership();
    const findOrCreate = jest
      .spyOn(ClubPlayerMembership, "findOrCreate")
      .mockResolvedValue([membership, true] as never);

    await service.upsertMembership(baseArgs({ confirmed: false }));

    expect(findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: expect.objectContaining({ confirmed: false }),
      })
    );
  });

  it("uses (clubId, playerId, start) as findOrCreate key", async () => {
    const membership = fakeMembership();
    const findOrCreate = jest
      .spyOn(ClubPlayerMembership, "findOrCreate")
      .mockResolvedValue([membership, true] as never);

    const start = new Date("2025-09-01");
    await service.upsertMembership(baseArgs({ start }));

    expect(findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club-uuid", playerId: "player-uuid", start },
        transaction: fakeTransaction,
      })
    );
  });

  it("end is null in result when membership.end is undefined", async () => {
    const membership = fakeMembership({ end: undefined });
    jest.spyOn(ClubPlayerMembership, "findOrCreate").mockResolvedValue([membership, true] as never);

    const result = await service.upsertMembership(baseArgs());

    expect(result.end).toBeNull();
  });
});
