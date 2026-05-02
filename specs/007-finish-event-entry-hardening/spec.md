# Feature Specification: finishEventEntry Hardening

**Feature Branch**: `007-finish-event-entry-hardening`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Backend hardening of finishEventEntry: wrap multi-write mutation in transaction, add idempotency guard so re-submission does not re-notify or re-log, add resolver spec test."

## Clarifications

### Session 2026-05-02

- Q: Mutation return shape — Boolean (FR-008) vs rich object (FR-004) — which? → A: Replace Boolean with `FinishEventEntryResult` object (`success`, `alreadyFinalised`, `notificationDispatched`). Breaking schema change; both first-party callers updated same release.
- Q: Behaviour when club has zero teams for season? → A: Reject with classified `GraphQLError` code `NO_TEAMS_TO_FINALISE`. No DB writes, no notification, no audit row.
- Q: Already-finalised re-submit with different email arg — what happens? → A: Update `club.contactCompetition` to new email (single write inside transaction); still return `alreadyFinalised: true`, no notification, no audit row. Contact email only permitted side-effect on no-op path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atomic submission finalisation (Priority: P1)

Club admin submits season enrollment. Backend finalises by updating club contact email, marking every team's `EventEntry.sendOn` timestamp, sending confirmation notification (push + email), writing audit log row. If any write fails mid-flight, DB must stay consistent — all writes succeed or none.

**Why this priority**: Today finalisation = sequence of independent writes. Partial failure (e.g. notification throws after `sendOn` set on three of five entries) leaves federation seeing inconsistent submission, audit log missing. Only blocker preventing frontend (BAD-122) from treating finalisation as reliable terminal step.

**Independent Test**: Inject forced failure on last write; verify earlier writes rolled back so next legitimate attempt sees original pre-submission state.

**Acceptance Scenarios**:

1. **Given** club with five team entries, all `sendOn = null`, **When** finalisation succeeds end-to-end, **Then** all five entries have `sendOn` set, audit log row exists, contact email updated, notification dispatched exactly once.
2. **Given** finalisation begins and audit-log write fails, **When** mutation returns, **Then** no entry has `sendOn` set, contact email unchanged, next retry behaves as if failed attempt never happened.
3. **Given** finalisation begins and notification dispatch fails, **When** mutation returns, **Then** DB state unchanged from before call.

---

### User Story 2 - Idempotent re-submission (Priority: P1)

Club admin triggers submission second time (double-click, retry after network blip, reload wizard before frontend "already submitted" guard renders). Backend must recognise club+season already finalised — no second confirmation email, no second audit-log entry, no overwrite of original `sendOn` timestamps.

**Why this priority**: Frontend guard (BAD-122) best-effort, races with reload. Without backend guard, duplicate emails go to club contacts, audit log ambiguous. Idempotency also required by project's create-mutation convention (Constitution Principle III, applied here for finalisation symmetry).

**Independent Test**: Call mutation twice with identical args; assert DB state identical after call 1 and call 2, notification service invoked only once.

**Acceptance Scenarios**:

1. **Given** every team entry for `(clubId, season)` already has `sendOn` set, **When** mutation called again, **Then** no notification sent, no log row written, no `sendOn` modified, response indicates already finalised.
2. **Given** some entries have `sendOn = null` and others do not (partial state from legacy half-finished submission), **When** mutation called, **Then** only null entries updated, single notification + audit-log row produced, result reflects fresh finalisation.
3. **Given** contact email arg differs from stored `club.contactCompetition` AND submission already finalised, **When** mutation called, **Then** `club.contactCompetition` IS updated to new value (single write inside transaction), no notification, no audit-log row, no `sendOn` touched, response carries `alreadyFinalised: true`.

---

### User Story 3 - Resolver test coverage (Priority: P2)

Backend dev changes any part of finalisation flow. Co-located resolver spec asserts mutation contract: auth gating, not-found handling, atomic success, transaction rollback on any internal failure, idempotency. CI fails fast if any contract broken.

**Why this priority**: Project testing convention (CLAUDE.md) requires `*.resolver.spec.ts` co-located with every resolver. `entry.resolver.ts` has none. Necessary infrastructure — not value-adding alone, but blocks regressions in P1/P2 stories above.

**Independent Test**: `nx test backend-graphql` passes with new spec exercising every acceptance scenario from Stories 1 and 2 using mocked Sequelize models and mocked notification service.

**Acceptance Scenarios**:

1. **Given** spec suite runs, **When** dev removes transaction wrapper, **Then** at least one rollback test fails.
2. **Given** spec suite runs, **When** dev removes idempotency guard, **Then** at least one duplicate-submission test fails.

---

### Edge Cases

- Club exists but zero teams for requested season: rejected with classified `GraphQLError` code `NO_TEAMS_TO_FINALISE`. No DB writes, no notification, no audit row. (See FR-009.)
- Caller has `edit-any:club` but not per-club permission: must succeed (matches current `hasAnyPermission` semantics).
- Team for club+season exists with `entry = null` (no `EventEntry` row yet): must skip, not throw. Matches today's `if (!team.entry) continue` branch.
- Notification service slow / times out: must NOT hold DB transaction open for network call duration. Notification dispatched after commit, failure surfaced as partial-success signal not rollback.
- Concurrent calls from two browser tabs: only one produces notification + log row. Other observes idempotent no-op outcome.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mutation MUST execute all DB writes (club email update, every `EventEntry.sendOn` update, audit-log row insertion) inside single Sequelize transaction. On any thrown error within transaction scope, every write MUST roll back.
- **FR-002**: Notification dispatch MUST occur AFTER transaction commits, not before. Dispatch failure MUST NOT roll back DB writes; response MUST signal partial success so caller can offer retry of notification step alone.
- **FR-003**: When every `EventEntry` for `(clubId, season)` already has non-null `sendOn`, mutation MUST: dispatch no notification, write no audit-log row, leave every `EventEntry.sendOn` unchanged, return `alreadyFinalised: true`. ONLY permitted DB write on no-op path is updating `club.contactCompetition` when supplied email differs from stored value; that single write MUST occur inside same transaction as read that determined already-finalised state.
- **FR-004**: Mutation MUST return `FinishEventEntryResult` object type carrying minimum: `success: Boolean!` (overall outcome), `alreadyFinalised: Boolean!` (true when call was no-op because `(clubId, season)` already finalised), `notificationDispatched: Boolean!` (true when post-commit notification call returned without error). Three flags together distinguish three outcomes: fresh finalisation succeeded, fresh finalisation succeeded but notification dispatch failed, already-finalised no-op.
- **FR-005**: Mutation MUST preserve current auth: callers must hold either `{clubId}_edit:club` or `edit-any:club`. Unauthorised callers MUST receive permission error, no side effects.
- **FR-006**: Mutation MUST preserve current not-found behaviour: unknown `clubId` MUST produce not-found error, no side effects.
- **FR-007**: Co-located `entry.resolver.spec.ts` MUST exist, MUST cover minimum: authorised vs unauthorised callers, unknown club, fresh finalisation happy path, transaction rollback on injected mid-flight failure, idempotent re-submission no-op, partial state where some entries already have `sendOn` set, notification-failure partial-success path. Spec MUST follow project resolver test convention (mocked `Sequelize.transaction`, `jest.spyOn` on model statics, fake `Player` with `hasAnyPermission` jest.fn()).
- **FR-008**: GraphQL schema `finishEventEntry` return type changes from `Boolean!` to `FinishEventEntryResult!` in single breaking release. Both first-party callers (legacy Angular wizard, new Next.js wizard) MUST update same release window. No deprecation alias retained.
- **FR-009**: When club has zero `Team` rows for requested season (regardless of whether any teams have `EventEntry`), mutation MUST throw `GraphQLError` with `extensions.code = NO_TEAMS_TO_FINALISE`. Error code MUST be added to shared registry at [`libs/backend/graphql/src/utils/error-codes.ts`](libs/backend/graphql/src/utils/error-codes.ts). No DB writes, no notification, no audit-log row on this path.

### Key Entities

- **FinishEventEntryResult**: Mutation return payload. Carries `success`, `alreadyFinalised`, `notificationDispatched`. Sole signal to callers about which of three terminal outcomes occurred.
- **EventEntry**: Per-team enrollment row. Carries `sendOn` timestamp federation reads to detect submission. Set of all `EventEntry` rows for `(clubId, season)` = source of truth for "is club's season already submitted".
- **Club**: Owns `contactCompetition` (federation-facing email). Updated by mutation when supplied email differs.
- **Logging**: Audit-log row written with action `EnrollmentSubmitted`, acting player, metadata `{ clubId, season, email }`. Exactly one row per fresh finalisation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero observed cases of partial finalisation state in prod logs over 4-week window post-deploy (no orphaned `sendOn` timestamps without matching audit-log row, vice versa).
- **SC-002**: Double-click or refresh-during-submit by end user produces exactly one confirmation email per `(clubId, season)`, verifiable in outbound mail logs.
- **SC-003**: 100% of acceptance scenarios in Stories 1 and 2 covered by automated tests in `entry.resolver.spec.ts`, suite runs under 5 seconds locally.
- **SC-004**: Dev can change any single line in finalisation flow and CI tells them within one test run whether contract still holds (no manual DB setup required).

## Assumptions

- Existing `notificationService.notifyEnrollment` impl acceptable as-is, treated as external side-effect invoked post-commit. Any retry mechanism for notification itself out of scope, lives behind partial-success response shape.
- "Already finalised" defined strictly as: every `Team.entry` for `(clubId, season)` exists and has `sendOn !== null`. Teams with no entry row ignored for this check (consistent with current loop guard).
- Breaking change to mutation return type acceptable because both consumers first-party, ship from this monorepo / sibling repo. Coordinated release: backend PR merges with frontend PRs that consume new shape. No external API contract exposed publicly.
- Frontend BAD-122 work lands separately, out of scope for this spec; spec only ensures backend contract sound enough to rely on.
- Concurrency bounded by Sequelize default isolation level; transaction plus `sendOn !== null` precheck inside transaction sufficient to serialise concurrent submitters of same `(clubId, season)`. Row-level lock on `Team.entry` rows for club+season MAY be added during planning if assumption challenged.

## Dependencies

- Backend models: `Club`, `Team`, `EventEntry`, `Logging`, `Player` (all in `@badman/backend-database`).
- Services: `NotificationService` (`@badman/backend-notifications`).
- Auth: `PermGuard` + `@User()` decorator (`@badman/backend-authorization`).
- No DB migration required — schema unchanged.
- No frontend coordination required for backend rollout itself; consumers (legacy Angular wizard, new Next.js wizard via BAD-122) call same mutation.