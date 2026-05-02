import { Test, TestingModule } from "@nestjs/testing";
import { Player, RankingPlace, RankingSystem, SubEventCompetition } from "@badman/backend-database";
import {
  getIndexFromPlayers,
  INDEX_CALCULATION_FIXTURES,
  SubEventTypeEnum,
} from "@badman/utils";
import { IndexCalculationService } from "./index-calculation.service";
import { IndexCalculationInput } from "./index-calculation.types";

const SYSTEM_ID = "system-uuid-0000-0000-0000-000000000000";
const SEASON = 2025;

/** Build a stub RankingSystem row */
const stubSystem = (overrides?: Partial<RankingSystem>): RankingSystem =>
  ({
    id: SYSTEM_ID,
    amountOfLevels: 12,
    primary: true,
    ...overrides,
  }) as unknown as RankingSystem;

/** Build a stub RankingPlace row */
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
      // Skip fixtures whose players have no gender (they'd trigger PLAYER_NOT_FOUND
      // in DB lookup mode — fixture parity is about the calculation path).
      const hasUngenderedPlayers = fixture.players.some(
        (p) => !("gender" in p) || p.gender === undefined
      );
      if (hasUngenderedPlayers) {
        test.skip(`${fixture.name} (skipped: un-gendered player)`, () => {});
        continue;
      }

      test(fixture.name, async () => {
        // Mock RankingSystem lookup
        jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(
          stubSystem({ amountOfLevels: fixture.defaultRanking ?? 12 })
        );

        // Players in fixtures already have gender; no Player.findAll needed.
        jest.spyOn(Player, "findAll").mockResolvedValue([]);

        // Stub RankingPlace: for each player that has undefined components,
        // return no row (so the default-fill path is exercised).
        const placeRows: RankingPlace[] = fixture.players
          .filter((p) => p.id && (p.single !== undefined || p.double !== undefined || p.mix !== undefined))
          .map((p) =>
            stubPlace(p.id ?? "", p.single, p.double, p.mix)
          );
        jest.spyOn(RankingPlace, "findAll").mockResolvedValue(placeRows);

        // Build an input where all components are pre-supplied by the fixture.
        const input: IndexCalculationInput = {
          key: "test-key",
          type: fixture.type,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          players: fixture.players.map((p) => ({
            id: p.id ?? "player-id",
            gender: p.gender,
            single: p.single,
            double: p.double,
            mix: p.mix,
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

      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(stubSystem());

      // Player.findAll returns only the good player (bad one not found).
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
          rankingSystemId: SYSTEM_ID,
          // Gender is pre-supplied so no DB lookup needed for this player.
          players: [{ id: goodPlayerId, gender: "M", single: 8, double: 8 }],
        },
        {
          key: "bad-key",
          type: SubEventTypeEnum.M,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          // No gender supplied → must be looked up → will not be found.
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
  // T017: Snapshot dedupe — one RankingPlace.findAll for inputs sharing
  //        (season, rankingSystemId).
  // -------------------------------------------------------------------------
  describe("snapshot dedupe", () => {
    it("calls RankingPlace.findAll exactly once when three inputs share (season, rankingSystemId)", async () => {
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(stubSystem());
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      const findAllSpy = jest
        .spyOn(RankingPlace, "findAll")
        .mockResolvedValue([]);

      const inputs: IndexCalculationInput[] = [
        {
          key: "key-1",
          type: SubEventTypeEnum.M,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          players: [{ id: "p1", gender: "M", single: 8, double: 8 }],
        },
        {
          key: "key-2",
          type: SubEventTypeEnum.M,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          players: [{ id: "p2", gender: "M", single: 8, double: 8 }],
        },
        {
          key: "key-3",
          type: SubEventTypeEnum.M,
          season: SEASON,
          rankingSystemId: SYSTEM_ID,
          players: [{ id: "p3", gender: "M", single: 8, double: 8 }],
        },
      ];

      await service.calculate(inputs);

      // All three share the same (season, rankingSystemId) group → one DB call.
      expect(findAllSpy).toHaveBeenCalledTimes(1);

      // The single call must include the union of all player IDs.
      const callArgs = findAllSpy.mock.calls[0][0] as { where: { playerId: string[] } };
      const fetchedIds: string[] = callArgs.where.playerId;
      expect(fetchedIds).toContain("p1");
      expect(fetchedIds).toContain("p2");
      expect(fetchedIds).toContain("p3");
    });
  });
});
