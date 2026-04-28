import {
  XmlRankingCategorySchema,
  XmlRankingPublicationSchema,
  XmlRankingSchema,
  XmlTournamentMatchSchema,
} from "../visual-result";

describe("XmlRankingPublicationSchema", () => {
  // ─── XML branch (current production happy path) ────────────────────────────
  it("accepts the XML branch shape (date-only PublicationDate, string Year/Week)", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "ABC",
      Name: "Week 10",
      Year: "2024",
      Week: "10",
      PublicationDate: "2024-03-04",
      Visible: true,
    });
    expect(result.success).toBe(true);
  });

  // ─── JSON branch (regression: this is what was crashing the publications step) ─
  it("accepts the JSON branch shape (ISO datetime PublicationDate, numeric Year/Week)", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "ABC",
      Name: "Week 10",
      Year: 2024,
      Week: 10,
      PublicationDate: "2024-03-04T00:00:00",
      Visible: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // coerced to strings via z.coerce
      expect(result.data.Year).toBe("2024");
      expect(result.data.Week).toBe("10");
    }
  });

  it("accepts ISO datetime with millis and Z", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "ABC",
      Name: "Week 10",
      Year: "2024",
      Week: "10",
      PublicationDate: "2024-03-04T00:00:00.000Z",
      Visible: true,
    });
    expect(result.success).toBe(true);
  });

  // ─── Failure modes that the old code silently misparsed ───────────────────
  it("rejects when PublicationDate is missing", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "ABC",
      Name: "Week 10",
      Year: "2024",
      Week: "10",
      Visible: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when PublicationDate is empty", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "ABC",
      Name: "Week 10",
      Year: "2024",
      Week: "10",
      PublicationDate: "",
      Visible: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when Code is missing", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Name: "Week 10",
      Year: "2024",
      Week: "10",
      PublicationDate: "2024-03-04",
      Visible: true,
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression guard: the `requiredCoercedString` helper.
//
// The original schemas used `z.coerce.string()` for required Code/MemberID/
// Year/Week/_ID/_Value fields. `z.coerce.string()` calls `String(input)`,
// which produces the literal string "undefined" for an undefined input —
// silently passing validation when a required field is missing.
//
// The fix replaces every required `z.coerce.string()` with a strict union
// (string | number → string) that rejects undefined. These tests pin the
// invariant across a sample of schemas from each cluster so we'll notice if
// anyone reintroduces the bad pattern.
// ────────────────────────────────────────────────────────────────────────────
describe("requiredCoercedString invariant", () => {
  it("XmlRankingSchema: rejects missing Code (does not coerce undefined to 'undefined')", () => {
    const result = XmlRankingSchema.safeParse({ Name: "Visual" });
    expect(result.success).toBe(false);
  });

  it("XmlRankingSchema: still accepts a numeric Code (XML can return numbers)", () => {
    const result = XmlRankingSchema.safeParse({ Code: 42, Name: "Visual" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.Code).toBe("42");
  });

  it("XmlRankingCategorySchema: rejects missing Code", () => {
    expect(XmlRankingCategorySchema.safeParse({ Name: "HE" }).success).toBe(false);
  });

  it("XmlRankingPublicationSchema: rejects missing Year (coerced fields too)", () => {
    const result = XmlRankingPublicationSchema.safeParse({
      Code: "P1",
      Name: "Week 10",
      Week: "10",
      PublicationDate: "2024-03-04",
      Visible: true,
    });
    expect(result.success).toBe(false);
  });

  it("XmlTournamentMatchSchema: rejects missing MatchID", () => {
    const result = XmlTournamentMatchSchema.safeParse({
      TournamentID: "T1",
      MatchDate: "2026-04-15T19:00:00",
    });
    expect(result.success).toBe(false);
  });

  it("XmlTournamentMatchSchema: accepts numeric MatchID", () => {
    const result = XmlTournamentMatchSchema.safeParse({
      TournamentID: 1,
      MatchID: 99,
      MatchDate: "2026-04-15T19:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.TournamentID).toBe("1");
      expect(result.data.MatchID).toBe("99");
    }
  });
});
