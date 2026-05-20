import {
  XmlItemSchema,
  XmlMatchSchema,
  XmlPlayerSchema,
  XmlRankingCategorySchema,
  XmlRankingPublicationSchema,
  XmlRankingSchema,
  XmlTeamMatchSchema,
  XmlTournamentDrawSchema,
  XmlTournamentMatchSchema,
  XmlTournamentSchema,
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

  // Visual API emits empty `<Team/>` elements which fast-xml-parser deserializes
  // to "" instead of an object. Schema must tolerate that without throwing.
  it("XmlItemSchema: coerces empty-string Team to undefined", () => {
    const result = XmlItemSchema.safeParse({ Code: "X", Team: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.Team).toBeUndefined();
  });

  it("XmlTournamentDrawSchema: accepts mixed string/object Team values across Items", () => {
    const result = XmlTournamentDrawSchema.safeParse({
      Code: "DR1",
      Name: "Draw 1",
      Structure: {
        Item: [
          { Code: "1", Team: "" },
          { Code: "2", Team: { Code: "T1", Name: "Foo" } },
        ],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Structure?.Item[0].Team).toBeUndefined();
      expect(result.data.Structure?.Item[1].Team).toEqual({ Code: "T1", Name: "Foo" });
    }
  });

  // Visual API sends bare numbers for Team1/Team2 (e.g. team-code IDs) when the
  // match slot is not yet filled. Schema must drop them to undefined (Sentry #116466287).
  it("XmlMatchSchema: coerces numeric Team1/Team2 to undefined", () => {
    const result = XmlMatchSchema.safeParse({ Code: "M1", Team1: 0, Team2: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Team1).toBeUndefined();
      expect(result.data.Team2).toBeUndefined();
    }
  });

  it("XmlMatchSchema: preserves object Team1/Team2", () => {
    const result = XmlMatchSchema.safeParse({
      Code: "M1",
      Team1: { Code: "T1", Name: "Alpha" },
      Team2: { Code: "T2", Name: "Beta" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Team1?.Code).toBe("T1");
      expect(result.data.Team2?.Code).toBe("T2");
    }
  });

  // Visual API sends Match-level Team1/Team2 objects without a Code field —
  // Code is only set on top-level draw teams (Sentry #116466287 follow-up).
  it("XmlMatchSchema: accepts Team1/Team2 object without Code", () => {
    const result = XmlMatchSchema.safeParse({
      Code: "M1",
      Team1: { Player1: { MemberID: "P1" } },
      Team2: { Player1: { MemberID: "P2" } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Team1?.Code).toBeUndefined();
      expect(result.data.Team2?.Code).toBeUndefined();
    }
  });

  // Visual API sometimes returns CourtName as a numeric court number (Sentry #117823630).
  it("XmlMatchSchema: coerces numeric CourtName to string", () => {
    const result = XmlMatchSchema.safeParse({ Code: "M1", CourtName: 3 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.CourtName).toBe("3");
  });

  it("XmlTeamMatchSchema: coerces numeric Team1/Team2 to undefined", () => {
    const result = XmlTeamMatchSchema.safeParse({ Code: "TM1", Team1: 42, Team2: 99 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.Team1).toBeUndefined();
      expect(result.data.Team2).toBeUndefined();
    }
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

  // Visual API /Tournament/:id/Player can include roster rows without a
  // MemberID (anonymous / placeholder entries, Sentry #104397491). Schema
  // must accept them so the whole sync batch isn't rejected.
  it("XmlPlayerSchema: accepts a Player row without MemberID", () => {
    const result = XmlPlayerSchema.safeParse({
      Firstname: "Jane",
      Lastname: "Doe",
      GenderID: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.MemberID).toBeUndefined();
  });

  it("XmlPlayerSchema: still coerces a numeric MemberID to string", () => {
    const result = XmlPlayerSchema.safeParse({ MemberID: 12345, Firstname: "Jane" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.MemberID).toBe("12345");
  });

  // Visual API sometimes returns TournamentTimezone as a number (Sentry #104397491).
  it("XmlTournamentSchema: coerces numeric TournamentTimezone to string", () => {
    const result = XmlTournamentSchema.safeParse({
      Code: "T1",
      Name: "Open 2026",
      TournamentTimezone: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.TournamentTimezone).toBe("1");
  });
});
