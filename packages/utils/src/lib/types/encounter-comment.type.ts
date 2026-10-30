/**
 * A comment as shown in the "Opmerkingen" table on the toernooi.nl encounter detail page.
 *
 * These comments only live on toernooi.nl: they are not synced into the badman
 * database, which is why an encounter can have a comment there while the badman
 * encounter page shows none.
 */
export interface EncounterComment {
  /** The comment itself */
  message: string;
  /** Who placed the comment (club or member name), when available */
  user?: string;
  /** Raw timestamp as shown on toernooi.nl (e.g. "zo 6-9-2026 16:16") */
  date?: string;
}
