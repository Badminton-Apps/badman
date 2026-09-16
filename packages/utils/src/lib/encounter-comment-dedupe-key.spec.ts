import { buildCommentDedupeKey, UNKNOWN_COMMENT_DEDUPE_KEY } from "./encounter-comment-dedupe-key";

describe("buildCommentDedupeKey", () => {
  const comment = {
    message: "Scores manueel ingegeven",
    user: "BC Den Dijk",
    date: "zo 6-9-2026 16:16",
  };

  it("returns the unknown key when there are no comments", () => {
    expect(buildCommentDedupeKey()).toBe(UNKNOWN_COMMENT_DEDUPE_KEY);
    expect(buildCommentDedupeKey([])).toBe(UNKNOWN_COMMENT_DEDUPE_KEY);
  });

  it("is stable for the same comments", () => {
    expect(buildCommentDedupeKey([comment])).toBe(buildCommentDedupeKey([{ ...comment }]));
  });

  it("changes when the message changes", () => {
    expect(buildCommentDedupeKey([comment])).not.toBe(
      buildCommentDedupeKey([{ ...comment, message: "Iets anders" }])
    );
  });

  it("changes when a comment is added", () => {
    expect(buildCommentDedupeKey([comment])).not.toBe(
      buildCommentDedupeKey([comment, { ...comment, message: "Tweede opmerking" }])
    );
  });

  it("handles comments without user and date", () => {
    expect(buildCommentDedupeKey([{ message: "Enkel bericht" }])).not.toBe(
      UNKNOWN_COMMENT_DEDUPE_KEY
    );
  });
});
