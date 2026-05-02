import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Player } from "@badman/backend-database";
import { IndexCalculationService } from "@badman/backend-enrollment";
import {
  INDEX_CALCULATION_FIXTURES,
  getIndexFromPlayers,
  SubEventTypeEnum,
} from "@badman/utils";
import { CalculateIndexResolver } from "./calculate-index.resolver";
import { CalculateIndexInput } from "./calculate-index.input";

const SYSTEM_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const SEASON = 2025;

const authenticatedUser = (allowed = true): Player =>
  ({
    id: "user-uuid",
    sub: "auth0|user-sub",
    hasAnyPermission: jest.fn().mockResolvedValue(allowed),
  }) as unknown as Player;

// Stub user returned by @User() for anonymous callers (no id, no sub).
const anonymousUser = (): Partial<Player> =>
  ({
    hasAnyPermission: jest.fn().mockReturnValue(false),
    // Notably: no `id` property
  }) as unknown as Partial<Player>;

const validInput = (overrides?: Partial<CalculateIndexInput>): CalculateIndexInput => ({
  key: "team-key-1",
  type: SubEventTypeEnum.M,
  season: SEASON,
  rankingSystemId: SYSTEM_ID,
  players: [
    { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", gender: "M", single: 8, double: 8 },
  ],
  ...overrides,
});

describe("CalculateIndexResolver", () => {
  let resolver: CalculateIndexResolver;
  let mockService: { calculate: jest.Mock };

  beforeEach(async () => {
    mockService = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculateIndexResolver,
        {
          provide: IndexCalculationService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<CalculateIndexResolver>(CalculateIndexResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // T024 (a) — Authenticated success: mixed Success + Failure → correctly folded
  // -------------------------------------------------------------------------
  it("returns correctly folded GraphQL shape for mixed Success and Failure results", async () => {
    const user = authenticatedUser();
    const goodKey = "team-key-1";
    const badKey = "team-key-2";

    mockService.calculate.mockResolvedValue([
      {
        _tag: "success",
        key: goodKey,
        index: 64,
        contributingPlayers: [
          { id: "p1", gender: "M", single: 8, double: 8, mix: 12 },
        ],
        missingPlayerCount: 3,
        resolvedPlayers: [],
      },
      {
        _tag: "failure",
        key: badKey,
        error: {
          code: "PLAYER_NOT_FOUND",
          message: "Players not found: p-missing",
          playerIds: ["p-missing"],
        },
      },
    ]);

    const inputs = [
      validInput({ key: goodKey }),
      validInput({ key: badKey, players: [{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99" }] }),
    ];

    const results = await resolver.calculateIndex(inputs, user);

    expect(results).toHaveLength(2);

    const [r0, r1] = results;
    expect(r0.key).toBe(goodKey);
    expect(r0.index).toBe(64);
    expect(r0.contributingPlayers).toHaveLength(1);
    expect(r0.missingPlayerCount).toBe(3);
    expect(r0.error).toBeUndefined();

    expect(r1.key).toBe(badKey);
    expect(r1.index).toBeUndefined();
    expect(r1.contributingPlayers).toBeUndefined();
    expect(r1.error?.code).toBe("PLAYER_NOT_FOUND");
    expect(r1.error?.playerIds).toContain("p-missing");
  });

  // -------------------------------------------------------------------------
  // T024 (b) — Anonymous user → UnauthorizedException
  // -------------------------------------------------------------------------
  it("throws UnauthorizedException for anonymous users (no id)", async () => {
    const user = anonymousUser() as Player;

    await expect(
      resolver.calculateIndex([validInput()], user)
    ).rejects.toThrow(UnauthorizedException);

    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T024 (c) — Empty inputs → BadRequestException
  // -------------------------------------------------------------------------
  it("throws BadRequestException for empty inputs array", async () => {
    const user = authenticatedUser();

    await expect(resolver.calculateIndex([], user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T024 (d) — Duplicate key within batch → BadRequestException
  // -------------------------------------------------------------------------
  it("throws BadRequestException when batch contains duplicate keys", async () => {
    const user = authenticatedUser();
    const inputs = [validInput({ key: "dup-key" }), validInput({ key: "dup-key" })];

    await expect(resolver.calculateIndex(inputs, user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T024 (e) — Malformed UUID in rankingSystemId → BadRequestException
  // -------------------------------------------------------------------------
  it("throws BadRequestException for malformed rankingSystemId UUID", async () => {
    const user = authenticatedUser();
    const input = validInput({ key: "k1", rankingSystemId: "not-a-uuid" });

    await expect(resolver.calculateIndex([input], user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T024 (e) — Malformed UUID in player id → BadRequestException
  // -------------------------------------------------------------------------
  it("throws BadRequestException for malformed player id UUID", async () => {
    const user = authenticatedUser();
    const input = validInput({
      key: "k1",
      players: [{ id: "bad-player-id", gender: "M" }],
    });

    await expect(resolver.calculateIndex([input], user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T024 (f) — Season out of range → BadRequestException
  // -------------------------------------------------------------------------
  it("throws BadRequestException when season is below 1990", async () => {
    const user = authenticatedUser();
    const input = validInput({ season: 1989 });

    await expect(resolver.calculateIndex([input], user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when season is above currentYear + 1", async () => {
    const user = authenticatedUser();
    const futureSeason = new Date().getFullYear() + 2;
    const input = validInput({ season: futureSeason });

    await expect(resolver.calculateIndex([input], user)).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T025 — Resolver parity loop
  // Each fixture: service returns a Success with the helper-computed index,
  // resolver maps it through, returned index matches expected.
  // -------------------------------------------------------------------------
  describe("parity with canonical helper (INDEX_CALCULATION_FIXTURES)", () => {
    for (const fixture of INDEX_CALCULATION_FIXTURES) {
      // Skip un-gendered fixture entries — they test the "player without gender
      // in MX is silently excluded" branch, which is a filter-level behaviour
      // tested in the service. The resolver is just a pass-through.
      const hasUngenderedPlayers = fixture.players.some(
        (p) => !("gender" in p) || p.gender === undefined
      );
      if (hasUngenderedPlayers) {
        test.skip(`${fixture.name} (skipped: un-gendered player)`, () => {});
        continue;
      }

      test(fixture.name, async () => {
        const user = authenticatedUser();
        const expectedIndex = getIndexFromPlayers(
          fixture.type,
          fixture.players,
          fixture.defaultRanking
        );

        // Stub service to return a Success with the helper-computed value.
        mockService.calculate.mockResolvedValue([
          {
            _tag: "success",
            key: "fixture-key",
            index: expectedIndex,
            contributingPlayers: [],
            missingPlayerCount: 0,
            resolvedPlayers: [],
          },
        ]);

        const input: CalculateIndexInput = {
          key: "fixture-key",
          type: fixture.type,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          players: fixture.players.map((p) => ({
            id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            gender: p.gender as "M" | "F" | undefined,
            single: p.single,
            double: p.double,
            mix: p.mix,
          })),
        };

        const results = await resolver.calculateIndex([input], user);

        expect(results).toHaveLength(1);
        expect(results[0].index).toBe(expectedIndex);
        expect(results[0].index).toBe(fixture.expected);
      });
    }
  });
});
