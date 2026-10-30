import { createHash } from "crypto";
import { EncounterComment } from "./types";

/** Used when we know there is a comment, but could not read its content. */
export const UNKNOWN_COMMENT_DEDUPE_KEY = "unknown";

/**
 * Builds a stable key for a set of encounter comments.
 *
 * Notifications store this key in their meta so a next run can tell whether it
 * would be notifying about comments that were already reported. Without it every
 * run of the check-encounters cron re-sends the same mail, since the comment
 * stays on toernooi.nl forever.
 */
export function buildCommentDedupeKey(comments?: EncounterComment[]): string {
  if (!comments?.length) {
    return UNKNOWN_COMMENT_DEDUPE_KEY;
  }

  const fingerprint = comments
    .map((comment) => [comment.message, comment.user ?? "", comment.date ?? ""].join("|"))
    .join("\n");

  return createHash("sha1").update(fingerprint).digest("hex");
}
