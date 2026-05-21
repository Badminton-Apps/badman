# Phase 0 Research: Gate Enrollment Validation Field

## R-001: How is `IndexCalculationService` invoked from the API process today?

**Decision (verified)**: Three trigger families in the api process.

1. **Read-side GraphQL field traversal** (dominant — root cause of the flood)
   - `EventEntry.enrollmentValidation` `@ResolveField` at
     [libs/backend/graphql/src/resolvers/event/entry.resolver.ts:86-95](../../libs/backend/graphql/src/resolvers/event/entry.resolver.ts#L86-L95).
   - Delegates to `EnrollmentValidationCacheService.getForTeam()` →
     `EnrollmentValidationService.fetchAndValidate()` →
     `IndexCalculationService.calculate([3 inputs per team of the club])`
     at [libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts:247-278](../../libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts#L247-L278).
   - DataLoader collapses calls to one computation per `(clubId, season)` per request. **No cross-request cache.**

2. **Write-side mutations** (rare; correct behavior)
   - `TeamsResolver.updateTeam` / `createTeams` at
     [libs/backend/graphql/src/resolvers/team/team.resolver.ts:375,431](../../libs/backend/graphql/src/resolvers/team/team.resolver.ts).
   - `EnrollmentEntryService.createEntry` at
     [libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts:131](../../libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts#L131).
   - `CalculateIndexResolver.calculateIndex` mutation (explicit recompute).

3. **Sequelize hook** (rare; correct behavior)
   - `EventEntry.recalculateCompetitionIndex` `@BeforeCreate` / `@BeforeUpdate` at
     [libs/backend/database/src/models/event/entry.model.ts:226-268](../../libs/backend/database/src/models/event/entry.model.ts#L226-L268). Fires only when `instance.meta` changed AND `meta.competition` exists.

**Rationale**: The 12:27 production logs show batches matching pattern (1) — input sizes 6, 16, 22, 26, 32, 36 with 4 player-refs per input, which corresponds to clubs of 2–12 teams × 3 inputs per team (`base`, `team`, `backup`). The "appname: api" in logs confirms it is the API process, not worker-sync.

**Alternatives considered**: None — this is fact-finding, not a choice.

---

## R-002: Where is the same field name exposed elsewhere?

**Decision (verified)**:

- Sibling resolver at [libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts:25-35](../../libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts#L25-L35) is a **top-level `@Query`** that already requires an explicit `EnrollmentInput` argument (`teams`, `clubId`, `season`). It is already opt-in by construction: a client must build and send the input or no computation occurs. **No additional gate needed there.**
- No other `enrollmentValidation` field exists in the GraphQL schema (verified via `grep -rn "enrollmentValidation" libs/backend/graphql`).

**Rationale**: Confirms spec FR-003 is satisfied by inspection and avoids needless edits.

---

## R-003: Approach for gating — field arg vs. dedicated query vs. cache

**Decision**: Optional GraphQL field argument with server-controlled default (env-var kill-switch).

**Rationale**:

- **Smallest blast radius**: schema stays backwards-compatible (field still exists, return type unchanged, only an optional new arg). Old query documents continue to validate against the new schema.
- **Frontend cost is one query string edit** in the active-frontend repo (the wizard query adds `(validate: true)`).
- **Kill-switch via `ENROLLMENT_VALIDATION_DEFAULT_ENABLED`** lets the platform team revert behavior per-environment without redeploy, satisfying spec FR-010.
- **No new schema entry point needed** — preserves existing client tooling and codegen.

**Alternatives considered**:

| Option | Rejected because |
|---|---|
| Cross-request Redis cache (e.g. 5–60 min TTL by `clubId:season`) | Doesn't help cold-cache stampedes. Validation depends on team rosters, player memberships, and ranking data that change continuously — invalidation surface is large. Doesn't eliminate the computation, only amortizes it; the original incident would still recur on cache-miss bursts. Useful as a follow-up, not as the primary fix. |
| Dedicated top-level `clubEnrollmentValidation(clubId: ID!, season: Int!)` query | Cleaner long-term API contract. But requires a frontend-repo query-shape change (not just an arg change), so coupling is tighter. Field-argument approach achieves the same runtime outcome with one server edit. Can refactor later without re-doing this work. |
| Detect sync-worker activity (via DB flag) and skip during sync window | Adds operational coupling between api and worker-sync. The flood would still happen during high-traffic daytime windows. The gate also has to be safe to flip; an env-var is simpler and less surprising. |
| Disable / remove the `enrollmentValidation` resolver entirely | Breaks the wizard. Non-starter. |

---

## R-004: Should `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` default to `false`?

**Decision**: `false` in all environments (development, staging, production).

**Rationale**:

- The fix is only effective if the default is `false`. A `true` default in development would mask whether the wizard's opt-in is actually wired up correctly — bugs would only surface in production where the default is `false`.
- A `false` default in development matches production behavior, eliminating environment drift.
- The platform team can still flip it temporarily via env var on a per-environment basis if the active frontend lags behind the backend deploy.

**Alternatives considered**:

- `true` in dev, `false` in prod: rejected — masks rollout bugs.
- Per-request header override (e.g. `x-validate-enrollment: true`): rejected — overlaps with the GraphQL arg and adds two ways to express the same intent.

---

## R-005: Test strategy

**Decision**: Unit tests only, mirroring the resolver-test convention in [enrollmentSetting.resolver.spec.ts](../../libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts).

Coverage:

1. `EventEntry.enrollmentValidation` resolver
   - Returns `null` when `validate` omitted and env flag false (no cache call).
   - Returns `null` when `validate: false` and env flag false.
   - Delegates to `EnrollmentValidationCacheService.getForTeam` when `validate: true`.
   - Delegates to `EnrollmentValidationCacheService.getForTeam` when `validate` omitted and env flag true (kill-switch path).
   - Surfaces cache failure (rejected promise) instead of swallowing to `null` (spec FR-006).
2. `IndexCalculationService`
   - When `options.caller` is provided, both DEBUG and WARN log lines include `[<caller>]`.
   - When `options.caller` is absent, log lines render without the tag (backwards-compatible format for log parsers, if any).
3. Existing tests for `enrollment.service.ts`, `team.resolver.ts`, `entry.model.ts`, `calculate-index.resolver.ts` continue to pass after the `caller` argument addition.

No integration test against a real database. No e2e test. No frontend test (separate repo).

**Rationale**: The change is structural (schema-level + log-level), not behavioral inside the computation. Existing integration coverage of `EnrollmentValidationService` is unaffected.

---

## R-006: Rollout sequencing

**Decision**: Single PR deploys server with default-off; second PR (in frontend repo) adds the opt-in to the wizard.

**Sequencing**:

1. Deploy backend with the gate. Active-frontend wizard temporarily receives `null` from `enrollmentValidation`.
2. If the wizard breaks visibly, platform team sets `ENROLLMENT_VALIDATION_DEFAULT_ENABLED=true` as a temporary kill-switch.
3. Active-frontend PR adds `(validate: true)` to the wizard query. Deploy.
4. Confirm wizard renders correctly. Unset the kill-switch (or leave it at `false`).

**Rationale**: The kill-switch makes the deploy reversible without a backend redeploy, removing the need to ship both repos in lockstep.

**Alternatives considered**:

- Ship both repos in lockstep: possible but operationally tighter; the kill-switch makes lockstep unnecessary.

---

## Open questions

None. All NEEDS CLARIFICATION items from the spec phase were resolved during specification.
