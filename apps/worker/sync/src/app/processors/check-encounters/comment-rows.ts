import { EncounterComment } from "@badman/utils";

/**
 * Maps the raw cell texts of the toernooi.nl "Opmerkingen" table to comments.
 *
 * The table renders one row per comment with an empty leading cell, the message,
 * the user and the timestamp. Empty cells are dropped so the mapping keeps
 * working when toernooi.nl adds or removes a spacer column.
 */
export function mapCommentRows(rows: string[][]): EncounterComment[] {
  return rows
    .map((row) => row.map(normalizeCell).filter((cell) => cell.length > 0))
    .filter((cells) => cells.length > 0)
    .map(([message, user, date]) => ({
      message,
      ...(user ? { user } : {}),
      ...(date ? { date } : {}),
    }));
}

function normalizeCell(cell: string | null | undefined) {
  return (cell ?? "").replace(/\s+/g, " ").trim();
}
