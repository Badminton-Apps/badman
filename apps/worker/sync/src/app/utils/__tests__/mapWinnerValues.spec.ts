import {
  WINNER_VALUE_MAPPING,
  REVERSE_WINNER_VALUE_MAPPING,
  reverseMapWinnerValue,
} from "../mapWinnerValues";

describe("WINNER_VALUE_MAPPING", () => {
  it("should map standard winners to themselves", () => {
    expect(WINNER_VALUE_MAPPING[1]).toBe(1);
    expect(WINNER_VALUE_MAPPING[2]).toBe(2);
  });

  it("should map special statuses to external values", () => {
    expect(WINNER_VALUE_MAPPING[4]).toBe(110);
    expect(WINNER_VALUE_MAPPING[5]).toBe(111);
    expect(WINNER_VALUE_MAPPING[6]).toBe(108);
    expect(WINNER_VALUE_MAPPING[7]).toBe(109);
    expect(WINNER_VALUE_MAPPING[12]).toBe(12);
  });
});

describe("REVERSE_WINNER_VALUE_MAPPING", () => {
  it("should be the inverse of WINNER_VALUE_MAPPING", () => {
    for (const [internal, external] of Object.entries(WINNER_VALUE_MAPPING)) {
      expect(REVERSE_WINNER_VALUE_MAPPING[external]).toBe(Number(internal));
    }
  });
});

describe("reverseMapWinnerValue", () => {
  it("should return null for null/undefined", () => {
    expect(reverseMapWinnerValue(null)).toBeNull();
    expect(reverseMapWinnerValue(undefined)).toBeNull();
  });

  it("should map known external values back to internal", () => {
    expect(reverseMapWinnerValue(110)).toBe(4);
    expect(reverseMapWinnerValue(111)).toBe(5);
    expect(reverseMapWinnerValue(108)).toBe(6);
    expect(reverseMapWinnerValue(109)).toBe(7);
  });

  it("should return the original value for unknown mappings", () => {
    expect(reverseMapWinnerValue(999)).toBe(999);
  });
});
