import { correctWrongTeams } from "../correctWrongTeams";

describe("correctWrongTeams", () => {
  it("should strip trailing number suffixes like (1) or (23)", () => {
    expect(correctWrongTeams({ name: "Team ABC (3)" })).toEqual({ name: "Team ABC" });
    expect(correctWrongTeams({ name: "Team ABC (12)" })).toEqual({ name: "Team ABC" });
  });

  it("should trim whitespace", () => {
    expect(correctWrongTeams({ name: "  Some Team  " })).toEqual({ name: "Some Team" });
  });

  it("should apply known replacements", () => {
    expect(correctWrongTeams({ name: "W&amp;L" }).name).toBe("W&L BV");
    expect(correctWrongTeams({ name: "Haneveld" }).name).toBe("Haeneveld");
    expect(correctWrongTeams({ name: "DZ 99" }).name).toBe("DZ99");
    expect(correctWrongTeams({ name: "De Voskes BC" }).name).toBe("BC De Voskes");
  });

  it("should not modify unknown team names", () => {
    expect(correctWrongTeams({ name: "Unknown Team" })).toEqual({ name: "Unknown Team" });
  });

  it("should preserve the id field", () => {
    expect(correctWrongTeams({ id: "abc", name: "Haneveld" })).toEqual({
      id: "abc",
      name: "Haeneveld",
    });
  });

  it("should stop after first matching replacement (finish=true)", () => {
    // "W&L BV" matches the second replacer and should not be further replaced
    expect(correctWrongTeams({ name: "W&L BV" }).name).toBe("W&L BV");
  });
});
