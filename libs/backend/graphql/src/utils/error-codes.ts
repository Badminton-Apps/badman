/**
 * Stable, machine-readable error codes that resolvers attach to thrown
 * `GraphQLError.extensions.code`. Clients pin behavior to these strings; the
 * human-readable `message` is a fallback only.
 *
 * Adding a code: append a key here, document the per-code `extensions` payload
 * in the resolver's contract document under `specs/`, and add a row to
 * `docs/tech-debt.md` only if shipping the code requires a knowing compromise.
 *
 * Removing a code is a breaking contract change for every consumer of the
 * affected resolver — coordinate with the active frontend repo first.
 */
export const ErrorCode = {
  // Cross-cutting
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // Enrollment (libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts)
  TEAM_NOT_FOUND: "TEAM_NOT_FOUND",
  SUB_EVENT_NOT_FOUND: "SUB_EVENT_NOT_FOUND",
  SEASON_MISMATCH: "SEASON_MISMATCH",

  // Team (libs/backend/graphql/src/resolvers/team/team.resolver.ts)
  CLUB_NOT_FOUND: "CLUB_NOT_FOUND",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  RANKING_NOT_FOUND: "RANKING_NOT_FOUND",
  TEAM_NUMBER_CONFLICT: "TEAM_NUMBER_CONFLICT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
