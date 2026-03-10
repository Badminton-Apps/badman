import { timeUnits } from "../timeUnits";

describe("timeUnits", () => {
  it("should return null for non-integer input", () => {
    expect(timeUnits(1.5)).toBeNull();
    expect(timeUnits(NaN)).toBeNull();
    expect(timeUnits(Infinity)).toBeNull();
  });

  it("should handle 0 ms", () => {
    const result = timeUnits(0);

    expect(result).toEqual(
      expect.objectContaining({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 })
    );
  });

  it("should break down milliseconds into correct units", () => {
    // 1 day + 2 hours + 3 minutes + 4 seconds + 5 ms
    const input = 86400000 + 7200000 + 180000 + 4000 + 5;
    const result = timeUnits(input);

    expect(result).toEqual(
      expect.objectContaining({ days: 1, hours: 2, minutes: 3, seconds: 4, ms: 5 })
    );
  });

  it("should handle exact unit boundaries", () => {
    expect(timeUnits(1000)).toEqual(
      expect.objectContaining({ days: 0, hours: 0, minutes: 0, seconds: 1, ms: 0 })
    );
    expect(timeUnits(60000)).toEqual(
      expect.objectContaining({ days: 0, hours: 0, minutes: 1, seconds: 0, ms: 0 })
    );
    expect(timeUnits(3600000)).toEqual(
      expect.objectContaining({ days: 0, hours: 1, minutes: 0, seconds: 0, ms: 0 })
    );
  });

  it("should handle negative values", () => {
    const result = timeUnits(-90000)!;

    expect(result).not.toBeNull();
    expect(result.minutes).toBe(-1);
    expect(result.seconds).toBe(-30);
  });

  describe("toString", () => {
    it("should format all computed units, not just the remainder", () => {
      const result = timeUnits(90000)!; // 1 min 30 sec

      expect(result.toString()).toBe("0, 0, 1, 30, 0");
    });

    it("should format a complex value correctly", () => {
      const input = 86400000 + 7200000 + 180000 + 4000 + 5;
      const result = timeUnits(input)!;

      expect(result.toString()).toBe("1, 2, 3, 4, 5");
    });

    it("should format zero correctly", () => {
      expect(timeUnits(0)!.toString()).toBe("0, 0, 0, 0, 0");
    });
  });
});
