import { SubEventTypeEnum } from "./enums";
import { IndexPlayer } from "./get-index";

export interface IndexCalculationFixture {
  name: string;
  type: SubEventTypeEnum;
  players: Partial<IndexPlayer>[];
  defaultRanking?: number;
  expected: number;
}

const m = (single?: number, double?: number, mix?: number, id = ""): Partial<IndexPlayer> => ({
  id,
  gender: "M",
  single,
  double,
  mix,
});
const f = (single?: number, double?: number, mix?: number, id = ""): Partial<IndexPlayer> => ({
  id,
  gender: "F",
  single,
  double,
  mix,
});

export const INDEX_CALCULATION_FIXTURES: IndexCalculationFixture[] = [
  // happy path — non-MX (M / F / NATIONAL)
  {
    name: "M: 4 fully ranked players (8/8 each) → 64",
    type: SubEventTypeEnum.M,
    players: [m(8, 8), m(8, 8), m(8, 8), m(8, 8)],
    expected: 64,
  },
  {
    name: "F: 4 fully ranked players (7 single + 9 double each) → 64",
    type: SubEventTypeEnum.F,
    players: [f(7, 9), f(7, 9), f(7, 9), f(7, 9)],
    expected: 64,
  },
  {
    name: "NATIONAL routes through non-MX branch",
    type: SubEventTypeEnum.NATIONAL,
    players: [m(8, 8), m(8, 8), m(8, 8), m(8, 8)],
    expected: 64,
  },

  // happy path — MX
  {
    name: "MX: 2M + 2F all 8/8/8 → 96",
    type: SubEventTypeEnum.MX,
    players: [m(8, 8, 8), m(8, 8, 8), f(8, 8, 8), f(8, 8, 8)],
    expected: 96,
  },
  {
    name: "MX: 2M + 2F all 7/9/8 → 96",
    type: SubEventTypeEnum.MX,
    players: [m(7, 9, 8), m(7, 9, 8), f(7, 9, 8), f(7, 9, 8)],
    expected: 96,
  },

  // selection — more than required
  {
    name: "M: 5 players → only best 4 by (single+double) count",
    type: SubEventTypeEnum.M,
    players: [m(5, 5), m(6, 6), m(7, 7), m(8, 8), m(9, 9)],
    expected: 52,
  },
  {
    name: "M: 8 players → 5th-and-beyond ignored, only best 4 used",
    type: SubEventTypeEnum.M,
    players: [
      m(4, 4),
      m(4, 4),
      m(4, 4),
      m(4, 4),
      m(11, 11),
      m(11, 11),
      m(11, 11),
      m(11, 11),
    ],
    expected: 32,
  },
  {
    name: "MX: 5M + 5F → best 2M + best 2F by (single+double+mix)",
    type: SubEventTypeEnum.MX,
    players: [
      m(2, 2, 2),
      m(3, 3, 3),
      m(4, 4, 4),
      m(5, 5, 5),
      m(6, 6, 6),
      f(2, 2, 2),
      f(3, 3, 3),
      f(4, 4, 4),
      f(5, 5, 5),
      f(6, 6, 6),
    ],
    expected: 30,
  },
  {
    name: "MX: 3M + 1F → best 2M + 1F + 1 missing-player penalty (+36)",
    type: SubEventTypeEnum.MX,
    players: [m(8, 8, 8), m(8, 8, 8), m(8, 8, 8), f(8, 8, 8)],
    expected: 108,
  },
  {
    name: "MX: 4M + 1F → still best 2M + 1F + 1 missing-player penalty",
    type: SubEventTypeEnum.MX,
    players: [
      m(8, 8, 8),
      m(8, 8, 8),
      m(8, 8, 8),
      m(8, 8, 8),
      f(8, 8, 8),
    ],
    expected: 108,
  },

  // missing-player penalty — non-MX (×24)
  {
    name: "M: 0 players → 4 × 24 = 96",
    type: SubEventTypeEnum.M,
    players: [],
    expected: 96,
  },
  {
    name: "M: 1 player (8/8) → 16 + 3×24 = 88",
    type: SubEventTypeEnum.M,
    players: [m(8, 8)],
    expected: 88,
  },
  {
    name: "M: 2 players (8/8 each) → 32 + 2×24 = 80",
    type: SubEventTypeEnum.M,
    players: [m(8, 8), m(8, 8)],
    expected: 80,
  },
  {
    name: "M: 3 players (8/8 each) → 48 + 1×24 = 72",
    type: SubEventTypeEnum.M,
    players: [m(8, 8), m(8, 8), m(8, 8)],
    expected: 72,
  },

  // missing-player penalty — MX (×36)
  {
    name: "MX: 0 players → 4 × 36 = 144",
    type: SubEventTypeEnum.MX,
    players: [],
    expected: 144,
  },
  {
    name: "MX: 1M only (8/8/8) → 24 + 3×36 = 132",
    type: SubEventTypeEnum.MX,
    players: [m(8, 8, 8)],
    expected: 132,
  },
  {
    name: "MX: 2M only (8/8/8 each) → 48 + 2×36 = 120",
    type: SubEventTypeEnum.MX,
    players: [m(8, 8, 8), m(8, 8, 8)],
    expected: 120,
  },
  {
    name: "MX: 1M + 1F (8/8/8 each) → 48 + 2×36 = 120",
    type: SubEventTypeEnum.MX,
    players: [m(8, 8, 8), f(8, 8, 8)],
    expected: 120,
  },

  // missing components — default fill
  {
    name: "M: each player has only `single=8` → (8+12) × 4 = 80",
    type: SubEventTypeEnum.M,
    players: [
      m(8, undefined),
      m(8, undefined),
      m(8, undefined),
      m(8, undefined),
    ],
    expected: 80,
  },
  {
    name: "M: each player has only `double=8` → (12+8) × 4 = 80",
    type: SubEventTypeEnum.M,
    players: [
      m(undefined, 8),
      m(undefined, 8),
      m(undefined, 8),
      m(undefined, 8),
    ],
    expected: 80,
  },
  {
    name: "MX: 2M+2F with `mix` undefined → (8+8+12) × 4 = 112",
    type: SubEventTypeEnum.MX,
    players: [
      m(8, 8, undefined),
      m(8, 8, undefined),
      f(8, 8, undefined),
      f(8, 8, undefined),
    ],
    expected: 112,
  },
  {
    name: "custom defaultRanking=10 fills missing components, but penalty stays 24",
    type: SubEventTypeEnum.M,
    players: [m(undefined, undefined)],
    defaultRanking: 10,
    expected: 92,
  },
  {
    name: "custom defaultRanking=10 with full team → uses 10 not 12",
    type: SubEventTypeEnum.M,
    players: [
      m(8, undefined),
      m(8, undefined),
      m(8, undefined),
      m(8, undefined),
    ],
    defaultRanking: 10,
    expected: 72,
  },

  // sort / determinism
  {
    name: "M: identical (single+double) sums produce a stable, deterministic result",
    type: SubEventTypeEnum.M,
    players: [m(6, 6), m(7, 7), m(8, 8), m(6, 6), m(7, 7), m(8, 8)],
    expected: 52,
  },
  {
    name: "M: result independent of input order (a)",
    type: SubEventTypeEnum.M,
    players: [m(5, 5), m(6, 6), m(7, 7), m(8, 8), m(9, 9)],
    expected: 52,
  },
  {
    name: "M: result independent of input order (b)",
    type: SubEventTypeEnum.M,
    players: [m(9, 9), m(8, 8), m(7, 7), m(6, 6), m(5, 5)],
    expected: 52,
  },
  {
    name: "M: result independent of input order (c)",
    type: SubEventTypeEnum.M,
    players: [m(7, 7), m(5, 5), m(9, 9), m(6, 6), m(8, 8)],
    expected: 52,
  },
  {
    name: "MX: gender filter — opposite-gender players excluded from each best-2 selection",
    type: SubEventTypeEnum.MX,
    players: [
      m(2, 2, 2),
      m(2, 2, 2),
      m(10, 10, 10),
      m(10, 10, 10),
      f(5, 5, 5),
      f(5, 5, 5),
    ],
    expected: 42,
  },

  // edge cases
  {
    name: "M: empty array → 96",
    type: SubEventTypeEnum.M,
    players: [],
    expected: 96,
  },
  {
    name: "MX: empty array → 144",
    type: SubEventTypeEnum.MX,
    players: [],
    expected: 144,
  },
  {
    name: "MX: players without gender are excluded by the gender filter (no throw)",
    type: SubEventTypeEnum.MX,
    players: [{ id: "p1", single: 8, double: 8, mix: 8 } as Partial<IndexPlayer>],
    expected: 144,
  },

  // property — determinism, monotonicity, irrelevance of worse extras
  {
    name: "determinism: same input twice yields the same output",
    type: SubEventTypeEnum.M,
    players: [m(7, 8), m(8, 7), m(9, 6), m(6, 9), m(10, 10)],
    expected: 60,
  },
  {
    name: "monotonicity: baseline 4×(8+8)=64",
    type: SubEventTypeEnum.M,
    players: [m(8, 8), m(8, 8), m(8, 8), m(8, 8)],
    expected: 64,
  },
  {
    name: "monotonicity: stronger player reduces index",
    type: SubEventTypeEnum.M,
    players: [m(7, 7), m(8, 8), m(8, 8), m(8, 8)],
    expected: 62,
  },
  {
    name: "adding a worse 5th player to a 4-player M team leaves the index unchanged",
    type: SubEventTypeEnum.M,
    players: [m(6, 6), m(6, 6), m(6, 6), m(6, 6), m(11, 11)],
    expected: 48,
  },
  {
    name: "getBestPlayersFromTeam equivalence (M)",
    type: SubEventTypeEnum.M,
    players: [m(7, 8), m(8, 7), m(9, 6), m(6, 9), m(10, 10)],
    expected: 60,
  },
  {
    name: "getBestPlayersFromTeam equivalence (MX)",
    type: SubEventTypeEnum.MX,
    players: [
      m(7, 8, 8),
      m(8, 7, 9),
      m(9, 6, 7),
      f(6, 9, 8),
      f(10, 10, 10),
    ],
    expected: 98,
  },
];
