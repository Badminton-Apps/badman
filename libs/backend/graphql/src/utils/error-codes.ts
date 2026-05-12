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
  UNAUTHENTICATED: "UNAUTHENTICATED",
  BAD_USER_INPUT: "BAD_USER_INPUT",
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

  // Club membership (libs/backend/graphql/src/resolvers/club/club.resolver.ts)
  MEMBERSHIP_NOT_FOUND: "MEMBERSHIP_NOT_FOUND",

  // Index calculation (libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts)
  RANKING_SYSTEM_NOT_FOUND: "RANKING_SYSTEM_NOT_FOUND",

  // Event entry finalisation (libs/backend/graphql/src/resolvers/event/entry.resolver.ts)
  NO_TEAMS_TO_FINALISE: "NO_TEAMS_TO_FINALISE",

  // Atomic enrollment submission (libs/backend/graphql/src/resolvers/event/competition/submit-enrollment.resolver.ts)
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
