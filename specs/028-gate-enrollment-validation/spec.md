# Feature Specification: Gate Enrollment Validation Field

**Feature Branch**: `028-gate-enrollment-validation`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User description: "Stop the IndexCalculationService flood that takes the API down during nightly ranking sync by making the EventEntry.enrollmentValidation GraphQL field opt-in instead of always running."

## Background & Problem Context

During the nightly ranking-sync window, the production API repeatedly fails health checks (`{"database":{"message":"timeout of 1000ms exceeded","status":"down"}}`) and restarts. Investigation shows the trigger is **not** ranking-sync itself — sync runs in the separate `worker-sync` process. The API process logs (`appname: 'api'`) show hundreds of `Slow index calculation` warnings emitted by `IndexCalculationService`, with durations climbing from ~1.5 s to ~29 s as the sync worker saturates the shared database.

The root cause is that the GraphQL field resolver `EventEntry.enrollmentValidation` currently:

- Has no field argument — it executes on every request that selects it.
- Triggers a **club-wide** validation (every team of the club, three index inputs per team: base / team / backup).
- Is cached only per request via a `DataLoader` — there is no cross-request cache.

So any client (e.g. a page rendering encounters, team listings, score-entry screens) that traverses an `EventEntry` and asks for the `enrollmentValidation` field forces a heavy multi-table scan per club. During sync, the database has no spare capacity → calls slow down → health checks time out → the API restarts → the cycle repeats.

The fix is to make this expensive computation **opt-in**: only the enrollment-wizard screen actually needs it. All other consumers should get `null` and not pay the cost.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Quiet API during nightly sync (Priority: P1)

As the platform operator, when the nightly ranking-sync cron runs, I need the public API to remain responsive and pass health checks, so that end users hitting the app at night still see content and the API process is not killed by the orchestrator's restart loop.

**Why this priority**: This is the production incident driving the work. Health-check failures cause API restarts that lose in-flight requests and trigger pager noise. P1.

**Independent Test**: Trigger the sync window in a staging environment (or simulate by running the sync worker against the staging DB) while a synthetic client polls representative GraphQL queries that previously caused the flood. Verify no `Slow index calculation` warnings appear from un-related queries, and health-check endpoints stay green throughout.

**Acceptance Scenarios**:

1. **Given** the sync worker is actively writing ranking data, **When** a GraphQL query that traverses `EventEntry` records is made without explicitly opting in to enrollment validation, **Then** the response returns `enrollmentValidation: null` and no `IndexCalculationService` calculation is performed.
2. **Given** the sync worker is actively writing ranking data, **When** the platform's automated health-check pings the API, **Then** it succeeds within the 1 s database timeout.
3. **Given** a 24-hour observation window covering at least one nightly sync, **When** the system is queried for `Slow index calculation` log occurrences from background (non-enrollment-wizard) traffic, **Then** the count is zero.

---

### User Story 2 — Enrollment wizard still works (Priority: P1)

As a club admin using the enrollment wizard, when I review my club's teams for the upcoming season, I need to still see the per-team enrollment validation (rule violations, computed team index, contributing players, etc.) so that I can finalize my submissions.

**Why this priority**: The change must not break the one consumer that legitimately needs the data. If the wizard breaks the rollout is reverted. P1.

**Independent Test**: Open the enrollment wizard for a representative club in a staging environment after the change is deployed and verify the same validation output as before is shown for every team. Compare side-by-side against a pre-change baseline of the same club/season.

**Acceptance Scenarios**:

1. **Given** the enrollment wizard is opened for a club and season, **When** the wizard requests enrollment validation explicitly, **Then** the same validation result (team indices, rule failures, base/team/backup ranks) is returned as before the change.
2. **Given** the wizard renders a club with 12 teams, **When** the validation completes, **Then** exactly one club-wide computation happens per request (not 12).

---

### User Story 3 — Other screens are unaffected (Priority: P2)

As a regular user (player, captain, spectator) browsing the app — looking at encounters, standings, my own profile, my team's roster — I should never trigger a club-wide validation computation just by loading a page.

**Why this priority**: Same root cause as Story 1, but observed during normal daytime traffic. Reducing background load improves performance broadly. P2.

**Independent Test**: Drive an automated walk-through of the public-facing pages and inspect API logs. No `Index calculation` (DEBUG or WARN) entries should appear from those flows.

**Acceptance Scenarios**:

1. **Given** a player profile page, an encounter detail page, or a team roster page is opened, **When** the page completes loading, **Then** no `IndexCalculationService` log entry is produced from that request.
2. **Given** any client that previously consumed the `enrollmentValidation` field without opting in, **When** it inspects the response, **Then** it sees the field key still present in the schema with a `null` value (no breaking schema removal).

---

### User Story 4 — Diagnostics for the next incident (Priority: P3)

As an engineer investigating a future regression, when I see a `Slow index calculation` warning in the logs, I want to know which code path triggered it so I can narrow the cause within minutes instead of hours.

**Why this priority**: This is a defensive add-on, not load-bearing for the fix. P3.

**Independent Test**: After the change, trigger each known caller (enrollment wizard, team-create mutation, entry-save hook) once and confirm the log line names the caller.

**Acceptance Scenarios**:

1. **Given** any `IndexCalculationService` log line (DEBUG or WARN), **When** I read it, **Then** it includes a stable caller identifier (e.g. `"EnrollmentValidationService.fetchAndValidate"`, `"TeamsResolver.createTeams"`, `"EventEntry hook"`).

---

### Edge Cases

- A query asks for `enrollmentValidation` with the opt-in **false**: must return `null` and skip computation entirely (no DB hit, no logs).
- A query asks for `enrollmentValidation` without supplying the argument: must default to the opt-out behavior (return `null`) — never silently compute.
- Multiple teams of the same club appear in one request and the client opts in: must collapse to one underlying club computation (existing per-request DataLoader behavior preserved).
- The opted-in computation fails internally: must surface a clear error to the caller, not a silent `null`, so the wizard distinguishes "not requested" from "computation failed".
- An entry's `meta.competition` is updated by a server-side write (e.g. team create / update mutation, sync worker writing player rosters from Visual): the existing per-entry `IndexCalculationService` recomputation on save MUST still run — that path is correct and rare and is **not** what's flooding the logs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `EventEntry.enrollmentValidation` GraphQL field MUST accept an opt-in argument and MUST return `null` without invoking any underlying computation when the argument is omitted or set to false.
- **FR-002**: When the opt-in argument is set to true, the field MUST return the same validation payload that the existing implementation returns today (no change to the shape, set of fields, or values).
- **FR-003**: The same opt-in semantics MUST apply to every GraphQL field in the schema that today delegates to `EnrollmentValidationCacheService` / `EnrollmentValidationService.fetchAndValidate` (i.e. the sibling `enrollmentValidation` resolver on the competition-enrollment graph node, if present).
- **FR-004**: Within a single GraphQL request, multiple opted-in lookups for the same `(clubId, season)` MUST collapse to one underlying validation (preserve current per-request DataLoader behavior).
- **FR-005**: The change MUST NOT remove the `enrollmentValidation` field from the schema, MUST NOT rename it, and MUST NOT change its return type — only add the argument.
- **FR-006**: When the opted-in computation fails internally (e.g. database error, missing ranking system), the response MUST surface the failure to the caller. It MUST NOT return a misleading `null` (which is now reserved for "not requested").
- **FR-007**: Server-side write paths that legitimately recompute index data (entry-save hook, team create/update mutations, explicit calculate-index mutation, enrollment-entry create) MUST continue to function unchanged.
- **FR-008**: Every `IndexCalculationService` log line (DEBUG and WARN) MUST include a stable caller identifier so a triage engineer can distinguish hot paths in production logs.
- **FR-009**: Existing unit tests for resolvers and the enrollment validation service MUST continue to pass; new tests MUST cover the opt-out (default) and opt-in branches of the gated resolver(s).
- **FR-010**: A rollout-safety mechanism MUST exist so that if the active frontend has not yet shipped the opt-in argument, the platform team can temporarily flip the default back to "always compute" without redeploying schema changes (e.g. a configuration knob).

### Key Entities *(include if feature involves data)*

- **EventEntry**: A team's entry into a sub-event. Carries the per-team enrollment metadata (`meta.competition.players` etc.). The GraphQL field under change is one of its resolvers; the underlying record is unchanged.
- **Enrollment Validation Result**: Existing computed object describing a club's teams and per-team rule violations and indices. Unchanged in shape; only **when** it is computed changes.
- **IndexCalculationService log event**: The slow/normal log line emitted per `calculate(...)` call. Gains a caller identifier under FR-008.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During the nightly sync window, zero `Health Check has failed!` events caused by database timeout, measured across at least 14 consecutive nights post-deploy. (Baseline: multiple failures per night, observed 2026-05-21.)
- **SC-002**: Across a representative 24-hour production window, the volume of `IndexCalculationService` log entries from non-enrollment-wizard traffic drops by at least 95% compared to the 24-hour window prior to deploy.
- **SC-003**: The enrollment-wizard end-to-end flow (open wizard → see per-team validation for all teams of a club → submit) completes successfully for the test club in staging, with identical validation output before and after the change.
- **SC-004**: When a triage engineer searches production logs for a single `Slow index calculation` warning, they can identify the originating code path in under 30 seconds from the log line alone, without needing to attach a debugger or open additional dashboards.
- **SC-005**: No regression in p95 latency of the enrollment-wizard query under typical club sizes (≤ 36 teams) compared to the pre-change baseline.

## Assumptions

- The active (Next.js) frontend lives in a separate repository. A coordinated change there (or a runtime config flip — see FR-010) is required so that the enrollment wizard explicitly opts in. The legacy Angular frontend in this repo is reference-only per `CLAUDE.md` and is not maintained.
- The current production cron schedule and worker topology (api process schedules crons, worker-sync runs sync jobs, both share the same Postgres instance) are out of scope. This work does not change them; it only stops the API process from generating background load that competes with the worker.
- Cross-request caching of validation results (e.g. Redis with TTL) is a possible follow-up but is **not** in scope here. The opt-in gate is sufficient to remove the production incident.
- The 1 s database health-check timeout is treated as a fixed environmental constraint. The fix removes the source of contention rather than relaxing the timeout.
- `IndexCalculationService.calculate` paths invoked by server-side **writes** (entry-save hook, team mutations, enrollment-entry create, explicit calculate-index mutation) are rare and correct, and are not the cause of the flood. They remain enabled by default and unchanged.
- "Stable caller identifier" (FR-008) is a free-form short string the developer sets at each call site; no enum or central registry is required.

## Out of Scope

- Cross-request caching of enrollment validation results.
- Splitting `enrollmentValidation` into a dedicated top-level GraphQL query (could be a future refactor, but the field-argument gate achieves the same effect with smaller blast radius).
- Disabling or rescheduling the ranking-sync cron, or changing connection-pool sizing.
- Changes to the active frontend (separate repository, separate ticket).
- Removing the legacy Angular consumer (legacy, not maintained).
- Changes to the entry-save hook recompute path.
