import { mapCommentRows } from "../comment-rows";

describe("mapCommentRows", () => {
  it("returns no comments for an empty table body", () => {
    expect(mapCommentRows([])).toEqual([]);
  });

  it("maps a toernooi.nl comment row (empty spacer cell, message, user, date)", () => {
    const rows = [["", "Scores manueel ingegeven", "BC Den Dijk", "zo 6-9-2026 16:16"]];

    expect(mapCommentRows(rows)).toEqual([
      {
        message: "Scores manueel ingegeven",
        user: "BC Den Dijk",
        date: "zo 6-9-2026 16:16",
      },
    ]);
  });

  it("collapses whitespace in the message", () => {
    const rows = [["", "  Badman app\n  werkte  niet goed ", "LoB bc", "ma 7-9-2026 12:10"]];

    expect(mapCommentRows(rows)[0].message).toBe("Badman app werkte niet goed");
  });

  it("keeps working when the spacer column is gone", () => {
    const rows = [["Bericht", "Gebruiker", "zo 6-9-2026 16:16"]];

    expect(mapCommentRows(rows)).toEqual([
      { message: "Bericht", user: "Gebruiker", date: "zo 6-9-2026 16:16" },
    ]);
  });

  it("omits user and date when they are not filled in", () => {
    expect(mapCommentRows([["", "Alleen een bericht"]])).toEqual([
      { message: "Alleen een bericht" },
    ]);
  });

  it("skips rows without any content", () => {
    const rows = [
      ["", "", ""],
      ["", "Echte opmerking", "Club", "vr 4-9-2026 10:00"],
    ];

    expect(mapCommentRows(rows)).toHaveLength(1);
  });

  it("maps every comment of a multi-comment table", () => {
    const rows = [
      ["", "Eerste", "Club A", "vr 4-9-2026 10:00"],
      ["", "Tweede", "Club B", "za 5-9-2026 11:00"],
    ];

    expect(mapCommentRows(rows).map((comment) => comment.message)).toEqual(["Eerste", "Tweede"]);
  });
});
