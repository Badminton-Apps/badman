import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Player } from "@badman/backend-database";
import { IndexCalculationService } from "@badman/backend-enrollment";
import {
  INDEX_CALCULATION_FIXTURES,
  getIndexFromPlayers,
  SubEventTypeEnum,
} from "@badman/utils";
import { GraphQLError } from "graphql";
import { CalculateIndexResolver } from "./calculate-index.resolver";
import { CalculateIndexInput } from "./calculate-index.input";

const SEASON = 2025;
const PLAYER_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";

const authenticatedUser = (): Player =>
  ({
    id: "user-uuid",
    hasAnyPermission: jest.fn().mockResolvedValue(true),
  }) as unknown as Player;

const anonymousUser = (): Player =>
  ({
    hasAnyPermission: jest.fn().mockReturnValue(false),
    // No `id` — anonymous stub from @User() decorator
  }) as unknown as Player;

const validInput = (overrides?: Partial<CalculateIndexInput>): CalculateIndexInput => ({
  key: "team-key-1",
  type: SubEventTypeEnum.M,
  season: SEASON,
  players: [{ id: PLAYER_UUID, gender: "M" }],
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
  // T024 (a) — Success path: service returns Success → result shape is correct
  // -------------------------------------------------------------------------
  it("maps IndexCalculationSuccess to CalculateIndexResult correctly", async () => {
    const user = authenticatedUser();

    mockService.calculate.mockResolvedValue([
      {
        _tag: "success",
        key: "team-key-1",
        index: 64,
        contributingPlayers: [
          { id: "p1", gender: "M", single: 8, double: 8, mix: 12 },
        ],
        missingPlayerCount: 3,
        resolvedPlayers: [],
      },
    ]);

    const results = await resolver.calculateIndex([validInput()], user);

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("team-key-1");
    expect(results[0].index).toBe(64);
    expect(results[0].contributingPlayers).toHaveLength(1);
    expect(results[0].missingPlayerCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // T024 (a-err) — Failure path: service returns Failure → throws GraphQLError
  // -------------------------------------------------------------------------
  it("throws GraphQLError with PLAYER_NOT_FOUND code when service returns a failure", async () => {
    const user = authenticatedUser();

    mockService.calculate.mockResolvedValue([
      {
        _tag: "failure",
        key: "team-key-1",
        error: {
          code: "PLAYER_NOT_FOUND",
          message: "Players not found: p-missing",
          playerIds: ["p-missing"],
        },
      },
    ]);

    await expect(
      resolver.calculateIndex([validInput()], user)
    ).rejects.toThrow(GraphQLError);

    await expect(
      resolver.calculateIndex([validInput()], user)
    ).rejects.toMatchObject({
      extensions: { code: "PLAYER_NOT_FOUND" },
    });
  });

  // -------------------------------------------------------------------------
  // T024 (b) — Anonymous user → UnauthorizedException
  // -------------------------------------------------------------------------
  it("throws UnauthorizedException for anonymous users (no id)", async () => {
    const user = anonymousUser();

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

    await expect(
      resolver.calculateIndex([validInput({ season: 1989 })], user)
    ).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when season is above currentYear + 1", async () => {
    const user = authenticatedUser();
    const futureSeason = new Date().getFullYear() + 2;

    await expect(
      resolver.calculateIndex([validInput({ season: futureSeason })], user)
    ).rejects.toThrow(BadRequestException);
    expect(mockService.calculate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // T025 — Resolver parity loop
  // -------------------------------------------------------------------------
  describe("parity with canonical helper (INDEX_CALCULATION_FIXTURES)", () => {
    for (const fixture of INDEX_CALCULATION_FIXTURES) {
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
          players: fixture.players.map(() => ({
            id: PLAYER_UUID,
            gender: undefined,
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
