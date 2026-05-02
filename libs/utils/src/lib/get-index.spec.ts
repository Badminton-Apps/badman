import { SubEventTypeEnum } from "./enums";
import {
  getBestPlayers,
  getBestPlayersFromTeam,
  getIndexFromPlayers,
  IndexPlayer,
} from "./get-index";

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
  describe("happy path — non-MX (M / F / NATIONAL)", () => {
    test("M: 4 fully ranked players (8/8 each) → 64", () => {
      const players = [m(8, 8), m(8, 8), m(8, 8), m(8, 8)];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(64);
    });

    test("F: 4 fully ranked players (7 single + 9 double each) → 64", () => {
      const players = [f(7, 9), f(7, 9), f(7, 9), f(7, 9)];
      expect(getIndexFromPlayers(SubEventTypeEnum.F, players)).toBe(64);
    });

    test("NATIONAL routes through non-MX branch", () => {
      const players = [m(8, 8), m(8, 8), m(8, 8), m(8, 8)];
      expect(getIndexFromPlayers(SubEventTypeEnum.NATIONAL, players)).toBe(64);
    });
  });

  describe("happy path — MX", () => {
    test("MX: 2M + 2F all 8/8/8 → 96", () => {
      const players = [m(8, 8, 8), m(8, 8, 8), f(8, 8, 8), f(8, 8, 8)];
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(96);
    });

    test("MX: 2M + 2F all 7/9/8 → 96", () => {
      const players = [m(7, 9, 8), m(7, 9, 8), f(7, 9, 8), f(7, 9, 8)];
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(96);
    });
  });

  describe("selection — more than required", () => {
    test("M: 5 players → only best 4 by (single+double) count", () => {
      // sums: 10, 12, 14, 16, 18 → best 4 = 10+12+14+16 = 52
      const players = [m(5, 5), m(6, 6), m(7, 7), m(8, 8), m(9, 9)];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(52);
    });

    test("M: 8 players → 5th-and-beyond ignored, only best 4 used", () => {
      // best 4: 4+4=8 each (×4) → 32
      const players = [
        m(4, 4),
        m(4, 4),
        m(4, 4),
        m(4, 4),
        m(11, 11),
        m(11, 11),
        m(11, 11),
        m(11, 11),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(32);
    });

    test("MX: 5M + 5F → best 2M + best 2F by (single+double+mix)", () => {
      const players = [
        // males: sums 6, 9, 12, 15, 18 → best 2 = 6+9 = 15
        m(2, 2, 2),
        m(3, 3, 3),
        m(4, 4, 4),
        m(5, 5, 5),
        m(6, 6, 6),
        // females: sums 6, 9, 12, 15, 18 → best 2 = 6+9 = 15
        f(2, 2, 2),
        f(3, 3, 3),
        f(4, 4, 4),
        f(5, 5, 5),
        f(6, 6, 6),
      ];
      // 6 + 9 + 6 + 9 = 30, 4 players present → no penalty
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(30);
    });

    test("MX: 3M + 1F → best 2M + 1F + 1 missing-player penalty (+36)", () => {
      const players = [m(8, 8, 8), m(8, 8, 8), m(8, 8, 8), f(8, 8, 8)];
      // 24 + 24 + 24 + (4-3)*36 = 72 + 36 = 108
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(108);
    });

    test("MX: 4M + 1F → still best 2M + 1F + 1 missing-player penalty", () => {
      const players = [
        m(8, 8, 8),
        m(8, 8, 8),
        m(8, 8, 8),
        m(8, 8, 8),
        f(8, 8, 8),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(108);
    });
  });

  describe("missing-player penalty — non-MX (×24)", () => {
    test("M: 0 players → 4 × 24 = 96", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.M, [])).toBe(96);
    });

    test("M: 1 player (8/8) → 16 + 3×24 = 88", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.M, [m(8, 8)])).toBe(88);
    });

    test("M: 2 players (8/8 each) → 32 + 2×24 = 80", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.M, [m(8, 8), m(8, 8)])).toBe(
        80
      );
    });

    test("M: 3 players (8/8 each) → 48 + 1×24 = 72", () => {
      expect(
        getIndexFromPlayers(SubEventTypeEnum.M, [m(8, 8), m(8, 8), m(8, 8)])
      ).toBe(72);
    });
  });

  describe("missing-player penalty — MX (×36)", () => {
    test("MX: 0 players → 4 × 36 = 144", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, [])).toBe(144);
    });

    test("MX: 1M only (8/8/8) → 24 + 3×36 = 132", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, [m(8, 8, 8)])).toBe(132);
    });

    test("MX: 2M only (8/8/8 each) → 48 + 2×36 = 120", () => {
      expect(
        getIndexFromPlayers(SubEventTypeEnum.MX, [m(8, 8, 8), m(8, 8, 8)])
      ).toBe(120);
    });

    test("MX: 1M + 1F (8/8/8 each) → 48 + 2×36 = 120", () => {
      expect(
        getIndexFromPlayers(SubEventTypeEnum.MX, [m(8, 8, 8), f(8, 8, 8)])
      ).toBe(120);
    });
  });

  describe("missing components — default fill", () => {
    test("M: each player has only `single=8` → (8+12) × 4 = 80", () => {
      const players = [
        m(8, undefined),
        m(8, undefined),
        m(8, undefined),
        m(8, undefined),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(80);
    });

    test("M: each player has only `double=8` → (12+8) × 4 = 80", () => {
      const players = [
        m(undefined, 8),
        m(undefined, 8),
        m(undefined, 8),
        m(undefined, 8),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(80);
    });

    test("MX: 2M+2F with `mix` undefined → (8+8+12) × 4 = 112", () => {
      const players = [
        m(8, 8, undefined),
        m(8, 8, undefined),
        f(8, 8, undefined),
        f(8, 8, undefined),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(112);
    });

    test("custom defaultRanking=10 fills missing components, but penalty stays 24", () => {
      // 1 fully unranked player present (all undefined) under default=10:
      // contributes 10+10 = 20, plus 3 × 24 missing-player penalty = 92
      const players = [m(undefined, undefined)];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players, 10)).toBe(92);
    });

    test("custom defaultRanking=10 with full team → uses 10 not 12", () => {
      // 4 players, each only single=8 → (8+10) × 4 = 72
      const players = [
        m(8, undefined),
        m(8, undefined),
        m(8, undefined),
        m(8, undefined),
      ];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players, 10)).toBe(72);
    });
  });

  describe("sort / determinism", () => {
    test("M: identical (single+double) sums produce a stable, deterministic result", () => {
      // Two players with sum 16, two with sum 14, two with sum 12 → best 4 = 12+12+14+14 = 52
      const players = [m(6, 6), m(7, 7), m(8, 8), m(6, 6), m(7, 7), m(8, 8)];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, players)).toBe(52);
    });

    test("M: result independent of input order", () => {
      const a = [m(5, 5), m(6, 6), m(7, 7), m(8, 8), m(9, 9)];
      const b = [m(9, 9), m(8, 8), m(7, 7), m(6, 6), m(5, 5)];
      const c = [m(7, 7), m(5, 5), m(9, 9), m(6, 6), m(8, 8)];
      const r = getIndexFromPlayers(SubEventTypeEnum.M, a);
      expect(getIndexFromPlayers(SubEventTypeEnum.M, b)).toBe(r);
      expect(getIndexFromPlayers(SubEventTypeEnum.M, c)).toBe(r);
    });

    test("MX: gender filter — opposite-gender players excluded from each best-2 selection", () => {
      // 2 strong men + 2 weak men + 2 women: best 2M must be the strong ones, women picked normally.
      const players = [
        m(2, 2, 2), // sum 6
        m(2, 2, 2), // sum 6
        m(10, 10, 10), // sum 30
        m(10, 10, 10), // sum 30
        f(5, 5, 5), // sum 15
        f(5, 5, 5), // sum 15
      ];
      // Best 2M = 6+6, Best 2F = 15+15 → 42
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, players)).toBe(42);
    });
  });

  describe("edge cases", () => {
    test("M: empty array → 96", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.M, [])).toBe(96);
    });

    test("MX: empty array → 144", () => {
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, [])).toBe(144);
    });

    test("player with `lastRanking` key but no gender → throws", () => {
      const bad = { id: "p1", lastRanking: { single: 8 } } as unknown as P;
      expect(() => getIndexFromPlayers(SubEventTypeEnum.M, [bad])).toThrow(
        /no gender/i
      );
    });

    test("MX: players without gender are excluded by the gender filter (no throw)", () => {
      const noGender = { id: "p1", single: 8, double: 8, mix: 8 } as P;
      // Only one un-gendered "player" → both M and F best-lists empty → 4 × 36 = 144
      expect(getIndexFromPlayers(SubEventTypeEnum.MX, [noGender])).toBe(144);
    });
  });

  describe("property — determinism, monotonicity, irrelevance of worse extras", () => {
    test("determinism: same input twice yields the same output", () => {
      const players = [m(7, 8), m(8, 7), m(9, 6), m(6, 9), m(10, 10)];
      const r1 = getIndexFromPlayers(SubEventTypeEnum.M, players);
      const r2 = getIndexFromPlayers(SubEventTypeEnum.M, players);
      expect(r1).toBe(r2);
    });

    test("monotonicity: lowering a contributing player's components never raises the index", () => {
      const baseline = [m(8, 8), m(8, 8), m(8, 8), m(8, 8)];
      const stronger = [m(7, 7), m(8, 8), m(8, 8), m(8, 8)];
      expect(
        getIndexFromPlayers(SubEventTypeEnum.M, stronger)
      ).toBeLessThanOrEqual(getIndexFromPlayers(SubEventTypeEnum.M, baseline));
    });

    test("adding a worse 5th player to a 4-player M team leaves the index unchanged", () => {
      const four = [m(6, 6), m(6, 6), m(6, 6), m(6, 6)];
      const fiveWithWorse = [...four, m(11, 11)];
      expect(getIndexFromPlayers(SubEventTypeEnum.M, fiveWithWorse)).toBe(
        getIndexFromPlayers(SubEventTypeEnum.M, four)
      );
    });

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
