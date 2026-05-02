import { Test, TestingModule } from "@nestjs/testing";
import { Player, RankingPlace, RankingSystem } from "@badman/backend-database";
import {
  getIndexFromPlayers,
  INDEX_CALCULATION_FIXTURES,
  SubEventTypeEnum,
} from "@badman/utils";
import { IndexCalculationService } from "./index-calculation.service";
import { IndexCalculationInput } from "./index-calculation.types";

const SYSTEM_ID = "system-uuid-0000-0000-0000-000000000000";
const SEASON = 2025;

const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: SYSTEM_ID,
    amountOfLevels: 12,
    primary: true,
    ...overrides,
  }) as unknown as RankingSystem;

const stubPlace = (
  playerId: string,
  single?: number,
  double_?: number,
  mix?: number
): RankingPlace =>
  ({
    playerId,
    systemId: SYSTEM_ID,
    single,
    double: double_,
    mix,
    rankingDate: new Date(`${SEASON}-05-15`),
    updatePossible: true,
  }) as unknown as RankingPlace;

describe("IndexCalculationService", () => {
  let service: IndexCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndexCalculationService],
    }).compile();

    service = module.get<IndexCalculationService>(IndexCalculationService);
  });

  afterEach(() => jest.restoreAllMocks());

  // -------------------------------------------------------------------------
  // T015: Fixture parity loop
  // -------------------------------------------------------------------------
  describe("parity with getIndexFromPlayers (INDEX_CALCULATION_FIXTURES)", () => {
    for (const fixture of INDEX_CALCULATION_FIXTURES) {
      const hasUngenderedPlayers = fixture.players.some(
        (p) => !("gender" in p) || p.gender === undefined
      );
      if (hasUngenderedPlayers) {
        test.skip(`${fixture.name} (skipped: un-gendered player)`, () => {});
        continue;
      }

      test(fixture.name, async () => {
        jest.spyOn(RankingSystem, "findOne").mockResolvedValue(
          stubSystem({ amountOfLevels: fixture.defaultRanking ?? 12 })
        );

        // Players have gender in fixture — no DB lookup needed.
        jest.spyOn(Player, "findAll").mockResolvedValue([]);

        // Use explicit non-empty IDs (fixture.players often have id = "").
        const playerIds = fixture.players.map((_, idx) => `player-${idx}`);

        const placeRows: RankingPlace[] = fixture.players.map((p, idx) =>
          stubPlace(playerIds[idx], p.single, p.double, p.mix)
        );
        jest.spyOn(RankingPlace, "findAll").mockResolvedValue(placeRows);

        const input: IndexCalculationInput = {
          key: "test-key",
          type: fixture.type,
          season: SEASON,
          players: fixture.players.map((p, idx) => ({
            id: playerIds[idx],
            gender: p.gender as "M" | "F" | undefined,
          })),
        };

        const result = await service.calculateOne(input);

        expect(result._tag).toBe("success");
        if (result._tag === "success") {
          const helperExpected = getIndexFromPlayers(
            fixture.type,
            fixture.players,
            fixture.defaultRanking
          );
          expect(result.index).toBe(helperExpected);
          expect(result.index).toBe(fixture.expected);
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // T016: Partial failure — one missing player does not fail the batch
  // -------------------------------------------------------------------------
  describe("partial failure does not fail the batch", () => {
    it("returns Success for input[0] and PLAYER_NOT_FOUND for input[1] when its player is absent", async () => {
      const goodPlayerId = "player-good-0000-0000-0000-000000000000";
      const badPlayerId = "player-bad--0000-0000-0000-000000000000";

      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());

      jest.spyOn(Player, "findAll").mockResolvedValue([
        { id: goodPlayerId, gender: "M" } as unknown as Player,
      ]);

      jest.spyOn(RankingPlace, "findAll").mockResolvedValue([
        stubPlace(goodPlayerId, 8, 8, 8),
      ]);

      const inputs: IndexCalculationInput[] = [
        {
          key: "good-key",
          type: SubEventTypeEnum.M,
          season: SEASON,
          // Gender pre-supplied so no DB lookup needed.
          players: [{ id: goodPlayerId, gender: "M" }],
        },
        {
          key: "bad-key",
          type: SubEventTypeEnum.M,
          season: SEASON,
          // No gender → must be looked up → not found.
          players: [{ id: badPlayerId }],
        },
      ];

      const results = await service.calculate(inputs);

      expect(results).toHaveLength(2);

      const [r0, r1] = results;
      expect(r0._tag).toBe("success");
      expect(r1._tag).toBe("failure");

      if (r1._tag === "failure") {
        expect(r1.error.code).toBe("PLAYER_NOT_FOUND");
        expect(r1.error.playerIds).toContain(badPlayerId);
      }
    });
  });

  // -------------------------------------------------------------------------
  // T017: Snapshot dedupe — one RankingPlace.findAll for inputs sharing season.
  // -------------------------------------------------------------------------
  describe("snapshot dedupe", () => {
    it("calls RankingPlace.findAll exactly once when three inputs share the same season", async () => {
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      const findAllSpy = jest
        .spyOn(RankingPlace, "findAll")
        .mockResolvedValue([]);

      const inputs: IndexCalculationInput[] = [
        {
          key: "key-1",
          type: SubEventTypeEnum.M,
          season: SEASON,
          players: [{ id: "p1", gender: "M" }],
        },
        {
          key: "key-2",
          type: SubEventTypeEnum.M,
          season: SEASON,
          players: [{ id: "p2", gender: "M" }],
        },
        {
          key: "key-3",
          type: SubEventTypeEnum.M,
          season: SEASON,
          players: [{ id: "p3", gender: "M" }],
        },
      ];

      await service.calculate(inputs);

      // All three share the same season → one DB call.
      expect(findAllSpy).toHaveBeenCalledTimes(1);

      const callArgs = findAllSpy.mock.calls[0][0] as { where: { playerId: string[] } };
      const fetchedIds: string[] = callArgs.where.playerId;
      expect(fetchedIds).toContain("p1");
      expect(fetchedIds).toContain("p2");
      expect(fetchedIds).toContain("p3");
    });
  });
});
