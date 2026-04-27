import { XmlRankingPublicationSchema } from "../visual-result";

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
