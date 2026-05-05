# Frontend Impact: Atomic Team Reorder

This doc lists every change the active frontend repo (the new Next.js app, separate from this monorepo) must know about when this backend feature ships. It is the "release note" the FE team / FE agent reads to land their half of FR-013.

The legacy Angular frontend in `apps/badman/` is out of scope per the constitution's legacy-frontend boundary; ignore it.

## Why this changes for the FE

- **Today** the FE owns team-number assignment. After every save it computes the new ordering client-side (sorted by `baseIndex`) and fires multiple parallel partial `updateTeam` calls, one per team that needs a new number. The backend rejects them with `TEAM_NUMBER_CONFLICT` and the user sees flicker, missing players, blank divisions.
- **After this release** the backend owns numbering, but only when the wizard explicitly asks for it. There is one new GraphQL mutation, `recalculateTeamNumbersForGroup`, that the enrollment wizard calls after each save and once per affected scope at the end of bulk operations. Existing mutations (`updateTeam`, `createTeam`, `createTeams`, `deleteTeam`) NEVER renumber as a side effect. Mid-season pages that edit teams (replacement-player workflows, captain edits) MUST NOT call the new mutation — team numbers are deliberately frozen for the rest of the season.

## Hard contract changes

### 1. New mutation: `recalculateTeamNumbersForGroup`

```graphql
mutation RecalculateTeamNumbers($clubId: ID!, $season: Int!, $type: SubEventTypeEnum!, $nationalCountsAsMixed: Boolean!) {
  recalculateTeamNumbersForGroup(
    clubId: $clubId
    season: $season
    type: $type
    nationalCountsAsMixed: $nationalCountsAsMixed
  ) {
    teams { id teamNumber name abbreviation type }
    affectedScope { clubId season types }
  }
}
```

Returns the affected scope's teams in their final 1..N order, plus the list of types it actually wrote (`[type]` for non-pooled, `[MX, NATIONAL]` for pooled).

**FE action**:
- Add the mutation + result types to the FE's GraphQL codegen.
- Wire it into the enrollment-wizard save flow (see "When to call" below).

### 2. `TeamUpdateInput.teamNumber` is removed

Sending `teamNumber` in any `updateTeam` payload is now a GraphQL validation error:

```text
Field "teamNumber" is not defined by type "TeamUpdateInput"
```

**FE action**:
- Remove `teamNumber` from every `updateTeam` payload, GraphQL fragment input, generated TS type, form binding, and zod/yup schema for the team-edit form.
- Remove the auto-renumber routine that fires after every save. It does not need a replacement; the wizard now calls `recalculateTeamNumbersForGroup` explicitly instead.

### 3. `createTeam` / `createTeams` no longer rely on `teamNumber` from the FE

The input still *accepts* `teamNumber` (no breaking change), but the value is now a placeholder — it'll be overwritten the next time the wizard calls the recalculate.

**FE action**:
- Stop sending `teamNumber` on team-create flows. Pass `null` / omit the field. The created team's final number comes from the next recalculate call's result.

### 4. `TEAM_NUMBER_CONFLICT` error code is no longer raised

The backend never throws `extensions.code = "TEAM_NUMBER_CONFLICT"` after this release.

**FE action**:
- Leave the error-map case in place for **one release** to handle in-flight requests during the deploy window.
- Remove the case in the next FE release; tracked as FE tech-debt.

## When to call `recalculateTeamNumbersForGroup`

The wizard calls it explicitly. Mid-season callers don't. Detail per flow:

| Wizard flow | Call recalculate? | Notes |
| --- | --- | --- |
| Edit a team's base roster (add / remove / change a base player) | yes, after the `updateTeam` save settles | Pass `(clubId, season, team.type, nationalCountsAsMixed)`. |
| Edit a team's metadata only (captain, phone, email) | no | Doesn't change `baseIndex`. The wizard MAY still call recalculate defensively (it's idempotent), but it's wasted load. |
| Create a single team | yes, after the `createTeam` save settles | Same args. |
| Bulk-create / import teams (`createTeams`) | yes, **once per distinct scope** after the bulk completes | Group the new teams by `(clubId, season, scopeKey)` and call recalculate once per group. Don't fire per-team. |
| Delete a team | yes, after the `deleteTeam` settles | Otherwise the scope has a gap. |
| Save with no actual change (e.g. user clicked Save without editing) | optional | Recalculate is idempotent; calling it is harmless. |

| Mid-season flow (NOT the enrollment wizard) | Call recalculate? |
| --- | --- |
| Replacement-player swap | NO. |
| Captain change | NO. |
| Contact-info edit | NO. |
| Anything else | NO. |

## Deriving `nationalCountsAsMixed`

The flag is per-call on the new mutation. The wizard already passes it on `createTeam`; pass the same value to `recalculateTeamNumbersForGroup`. If the wizard doesn't track it explicitly today, derive it the same way `createTeam` does (whatever signal the existing code uses — typically a club setting or a per-call wizard option). When in doubt, default to `false`.

For type=NATIONAL, the flag is irrelevant — pass either value. The recalculate will operate on the NATIONAL tier alone (the lock key still collides with `MX+NAT` to prevent races with concurrent MX-pooled calls).

## Behavior changes (no contract impact, but the FE must adapt)

### 5. The recalculate may renumber teams the FE didn't explicitly touch

When pooling is on, calling recalculate for `type=MX` may also rewrite NATIONAL teams' numbers (per the federation tier rule). The result's `teams` array contains both tiers; the result's `affectedScope.types` lists `[MX, NATIONAL]`. Use `affectedScope.types` to decide which views to invalidate / refetch in the cache.

### 6. Concurrency is now safe — drop client-side serialization

The FE no longer needs to debounce, queue, or serialize team-edit saves to dodge `TEAM_NUMBER_CONFLICT`. The new mutation serializes per scope via a postgres advisory lock; parallel calls to it are correct.

**FE action**:
- Remove any "wait for the previous save before firing the next" wrapper around team mutations.
- For two parallel `recalculateTeamNumbersForGroup` calls against the same scope, the second simply waits for the first; both succeed and both return the post-state. Optimistic UI is fine.

### 7. The recalculate is idempotent

Calling it with the same inputs N times produces the same final state. Safe under React StrictMode double-fires, "Save" double-clicks, and retry logic.

## Trigger semantics — what each mutation does after this release

| Mutation | Writes `teamNumber` / `name` / `abbreviation`? | Notes |
| --- | --- | --- |
| `updateTeam` | NO | Roster, captain, contact, etc. only. The fields are removed from the input shape. |
| `createTeam` | placeholder only (kept from existing logic) | Initial number is whatever `MAX(teamNumber)+1` produces (with `nationalCountsAsMixed` pooling); not authoritative. |
| `createTeams` | placeholder only (delegates to `createTeam`) | Same. |
| `deleteTeam` | NO | Leaves a gap until the next recalculate. |
| `recalculateTeamNumbersForGroup` | YES — the only path that does | Authoritative. |

## Things that did NOT change

- `Team` GraphQL type: same fields, same relations.
- `TeamResult` (return type of `createTeam` / `createTeams`): unchanged.
- `updateTeam` return type: still `Team`.
- `nationalCountsAsMixed` flag on `createTeam`: kept as-is. Federation rule still drives initial-number placeholders.
- Authorization model: still `<clubId>_edit:club` / `edit-any:club` via `PermGuard` + resolver checks. Same 401/403 behavior.
- Existing error codes (`CLUB_NOT_FOUND`, `PERMISSION_DENIED`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`, `INTERNAL_ERROR`, `TEAM_NOT_FOUND`): unchanged.
- The legacy `_temp` name suffix issue: confined to local/staging — no production exposure, no migration ships. Local/staging rows self-heal the next time their scope is recalculated.
- i18n keys: no changes.

## Release coordination

- **Ship together**: backend release and FE release land in the same window. A backend without the FE half is OK (FE keeps sending `teamNumber`; backend rejects the field at the input boundary so FE will see a GraphQL validation error — which is the FE's signal to deploy). An FE without the backend half is broken (`recalculateTeamNumbersForGroup` doesn't exist yet → mutation fails with `Cannot query field`).
- **Order of deploy**: backend first. The backend tolerates an FE that still sends `teamNumber` only because the GraphQL layer rejects unknown fields — so the FE will visibly fail until it deploys.
- **Active-frontend Linear ticket**: pair this work with whatever issue tracks the FE migration (search the BAD project for "team renumber" / "auto-renumber"; create one if it does not exist). Cross-link from the backend PR.

## TL;DR for the FE engineer

1. Stop sending `teamNumber` in any team mutation. Ever.
2. After each enrollment-wizard save (and at the end of each bulk), call `recalculateTeamNumbersForGroup(clubId, season, type, nationalCountsAsMixed)`. Render the result.
3. Mid-season pages MUST NOT call the new mutation; team numbers are intentionally frozen.
4. Drop the client-side auto-renumber routine and any save-serializing wrapper.
5. Remove the `TEAM_NUMBER_CONFLICT` error-map case in the FE's next release (one cycle behind backend).
