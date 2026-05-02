import { SubEventTypeEnum } from "./enums";
import {
  getBestPlayers,
  getBestPlayersFromTeam,
  getIndexFromPlayers,
  IndexPlayer,
} from "./get-index";
import { INDEX_CALCULATION_FIXTURES } from "./get-index.fixtures";

type P = Partial<IndexPlayer>;

const m = (single?: number, double?: number, mix?: number, id = ""): P => ({
  id,
  gender: "M",
  single,
  double,
  mix,
});
const f = (single?: number, double?: number, mix?: number, id = ""): P => ({
  id,
  gender: "F",
  single,
  double,
  mix,
});

describe("getIndexFromPlayers — canonical team-strength formula", () => {
  describe("fixture-driven parity tests (INDEX_CALCULATION_FIXTURES)", () => {
    for (const fixture of INDEX_CALCULATION_FIXTURES) {
      test(fixture.name, () => {
        expect(
          getIndexFromPlayers(fixture.type, fixture.players, fixture.defaultRanking)
        ).toBe(fixture.expected);
      });
    }
  });

  describe("edge cases not covered by fixtures (throws)", () => {
    test("player with `lastRanking` key but no gender → throws", () => {
      const bad = { id: "p1", lastRanking: { single: 8 } } as unknown as P;
      expect(() => getIndexFromPlayers(SubEventTypeEnum.M, [bad])).toThrow(
        /no gender/i
      );
    });
  });

  describe("property — result independent of input order", () => {
    test("M: result independent of input order", () => {
      const a = [m(5, 5), m(6, 6), m(7, 7), m(8, 8), m(9, 9)];
      const b = [m(9, 9), m(8, 8), m(7, 7), m(6, 6), m(5, 5)];
      const c = [m(7, 7), m(5, 5), m(9, 9), m(6, 6), m(8, 8)];
      const r = getIndexFromPlayers(SubEventTypeEnum.M, a);
      expect(getIndexFromPlayers(SubEventTypeEnum.M, b)).toBe(r);
      expect(getIndexFromPlayers(SubEventTypeEnum.M, c)).toBe(r);
    });
  });

  describe("property — monotonicity", () => {
    test("monotonicity: lowering a contributing player's components never raises the index", () => {
      const baseline = [m(8, 8), m(8, 8), m(8, 8), m(8, 8)];
      const stronger = [m(7, 7), m(8, 8), m(8, 8), m(8, 8)];
      expect(
        getIndexFromPlayers(SubEventTypeEnum.M, stronger)
      ).toBeLessThanOrEqual(getIndexFromPlayers(SubEventTypeEnum.M, baseline));
    });
  });

  describe("cross-equivalence — getBestPlayersFromTeam", () => {
    test("getBestPlayersFromTeam(...).index equals getIndexFromPlayers(...) for the same input (M)", () => {
      const players = [m(7, 8), m(8, 7), m(9, 6), m(6, 9), m(10, 10)];
      expect(getBestPlayersFromTeam(SubEventTypeEnum.M, players).index).toBe(
        getIndexFromPlayers(SubEventTypeEnum.M, players)
      );
    });

    test("getBestPlayersFromTeam(...).index equals getIndexFromPlayers(...) for the same input (MX)", () => {
      const players = [
        m(7, 8, 8),
        m(8, 7, 9),
        m(9, 6, 7),
        f(6, 9, 8),
        f(10, 10, 10),
      ];
      expect(getBestPlayersFromTeam(SubEventTypeEnum.MX, players).index).toBe(
        getIndexFromPlayers(SubEventTypeEnum.MX, players)
      );
    });
  });
});

describe("getBestPlayers — selection only", () => {
  test("M: returns up to 4 players sorted by (single+double) ascending", () => {
    const players = [m(9, 9, 0, "a"), m(5, 5, 0, "b"), m(7, 7, 0, "c"), m(6, 6, 0, "d"), m(8, 8, 0, "e")];
    const best = getBestPlayers(SubEventTypeEnum.M, players);
    expect(best.map((p) => p?.id)).toEqual(["b", "d", "c", "e"]);
  });

  test("MX: returns up to 2 men + up to 2 women", () => {
    const players = [
      m(9, 9, 9, "m1"),
      m(5, 5, 5, "m2"),
      m(7, 7, 7, "m3"),
      f(8, 8, 8, "f1"),
      f(6, 6, 6, "f2"),
      f(4, 4, 4, "f3"),
    ];
    const best = getBestPlayers(SubEventTypeEnum.MX, players);
    expect(best.map((p) => p?.id).sort()).toEqual(["f2", "f3", "m2", "m3"]);
  });
});
