# GraphQL Contract — EventEntry fields touched

The public GraphQL schema is **unchanged**. The fields below keep their existing types and nullability; only their server-side resolution strategy changes.

## `type EventEntry`

| Field                  | Type                          | Nullability | Changes |
|------------------------|-------------------------------|-------------|---------|
| `team`                 | `Team`                        | nullable in DB (FK may be null); current schema declares non-null. Behavior: returns `null` when `teamId` is null or row missing. | Resolver now reads from `TeamLoaderService.load(parent.teamId)` instead of `parent.getTeam()`. No observable change for clients with valid data; previously a missing row could throw — going forward it returns `null` (matches DataLoader contract and the spec's edge cases). |
| `standing`             | `Standing`                    | nullable    | Resolver now reads from `StandingLoaderService.load(parent.id)` instead of `parent.getStanding()`. Missing row → `null`, identical to today. |
| `enrollmentValidation` | `TeamEnrollmentOutput`        | nullable    | Internally uses the same `TeamLoaderService.load(parent.teamId)` instead of calling `parent.getTeam()`. Output payload is unchanged. |

## Operations exercised

- `query GetClubTeams` (production operation reported by Sentry 121423071). After this change, a single request that returns N entries triggers exactly:
  - 1 × `SELECT ... FROM public.Teams WHERE id IN (...)`
  - 1 × `SELECT ... FROM event.Standings WHERE entryId IN (...)`

  …regardless of N.

## Backwards compatibility

- No schema deltas (no new types, no field renames, no nullability flips at the schema level).
- No new arguments.
- No new directives.
- No new error codes (loader failures bubble as the same Sequelize error the per-row call would have produced).

## Out of scope

- Other `EventEntry` fields (`players`, `drawCompetition`, `drawTournament`, `subEventTournament`) keep their current per-row resolution. Their contracts are unchanged.
