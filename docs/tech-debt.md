# Technical debt registry

<!--
Versions (newest first):
- v1.1 — 2026-04-29 — Add three BAD-21 backend entries: no DB-level
  uniqueness on Entries (narrow concurrent-write window), silent
  cross-sub-event move on createEnrollment, deferred capacity-error codes
  (SUB_EVENT_FULL etc.).
- v1.0 — 2026-04-27 — Initial registry: three seed entries (Visual API
  date duality, XmlScores/XmlStats z.unknown(), legacy Angular frontend).
-->

## How to use

- **Add** an entry the same commit you ship a *knowing* compromise. Don't add things you'd routinely fix in a small refactor.
- **Remove** an entry in the same commit that resolves the debt. Stale entries are worse than missing ones.
- **Required fields** per entry: where, what, why we shipped it, fix effort + trigger to revisit. Skip the rest.
- **Add a row** to the table below for every entry, in the same order. Sort within each Area by impact (worst first).
- **Bump the version** at the top when you add, remove, or materially edit an entry.

## Debt table

| Title | Area | Where | Effort | Trigger to revisit | Status |
|---|---|---|---|---|---|
| [Visual API: schema/interface duality on Date fields](#visual-api-schemainterface-duality-on-date-fields) | Backend | `libs/backend/visual/src/utils/visual-result.ts` | ~1 day | New Visual date field, or sync regression from a date-format change | open |
| [Visual API: XmlScores / XmlStats kept as z.unknown()](#visual-api-xmlscores--xmlstats-kept-as-zunknown) | Backend | `libs/backend/visual/src/utils/visual-result.ts` | ~half day | First feature that actually reads `.Scores.Score` / `.Stats.Stat` | open |
| [Enrollment: no DB-level uniqueness on `Entries`](#enrollment-no-db-level-uniqueness-on-entries) | Backend | `libs/backend/database/src/models/event/entry.model.ts`, `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts` | ~half day | First observed duplicate-entry incident in prod, OR a contention bug report on the enrollment-submit flow | open |
| [Enrollment: silent cross-sub-event move on createEnrollment](#enrollment-silent-cross-sub-event-move-on-createenrollment) | Backend | `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts` | ~half day (BE) + FE coordination | Product asks why teams "disappear" from one sub-event after re-enrolling into another | open |
| [Enrollment: capacity-style error codes deferred from BAD-21 v1](#enrollment-capacity-style-error-codes-deferred-from-bad-21-v1) | Backend | `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts` | ~quarter day per code | First product/UX request for "sub-event full" feedback, or first time a sub-event hits a published cap | open |
| [Legacy Angular frontend](#legacy-angular-frontend) | Frontend | `apps/badman/`, `libs/frontend/` | 1–2 days | New frontend repo solo in prod for one release cycle | open |

---

## Backend

### Visual API: schema/interface duality on Date fields

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlTournament`, `XmlMatch`, `XmlTeamMatch`, `XmlItem` interfaces vs their `*Schema` zod schemas.
- **What**: ~16 date fields (`StartDate`, `EndDate`, `MatchTime`, `LastUpdated`, the various `*PublicationDate` fields) are typed as `Date` in the consumer-facing interfaces but as `string` in the runtime schemas.
- **Why we shipped it**: collapsing to one source of truth means either (a) transforming strings → Date in the schema, or (b) updating ~20 consumer call sites in worker-sync that assign these fields to Sequelize `Date` columns. Out of scope for the validation rollout. Not actively buggy — the one case that *was* (broken `PublicationDate`) is fixed.
- **Fix**: path A. Add a shared `xmlDate` helper:
  ```ts
  const xmlDate = z
    .union([z.string(), z.date()])
    .transform((v): Date | null => {
      if (v instanceof Date) return isValid(v) ? v : null;
      const parsed = parseISO(v);
      return isValid(parsed) ? parsed : null;
    })
    .nullable()
    .optional();
  ```
  Replace `z.string().optional()` with `xmlDate` on the date fields. Drop the legacy interfaces; let `z.infer` give consumers `Date | null`. Update [event.processor.ts](../apps/worker/sync/src/app/processors/sync-events-v2/tournament/processors/event.processor.ts) for the `null` case. Rewrite affected tests in [visual.service.spec.ts](../libs/backend/visual/src/services/__tests__/visual.service.spec.ts) to expect `Date` instances.
- **Status**: open. **Owner**: unowned.

### Visual API: XmlScores / XmlStats kept as z.unknown()

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlScoresSchema.Score`, `XmlStatsSchema.Stat`.
- **What**: inner field is `z.unknown()`; the legacy `XmlScores` / `XmlStats` interfaces still live alongside the schemas. Every other wrapper (`XmlPlayers`, `XmlStructure`, `XmlSets`) was unified in `58bfc2456`.
- **Why we shipped it**: `arrayOf(XmlScoreSchema)` / `arrayOf(XmlStatSchema)` re-trip TS7056 ("inferred type exceeds maximum length") because the recursion `XmlMatch → XmlSets → XmlSet → XmlScores` is too deep. Nothing reads `.Score` or `.Stat` today (`ScoreStatus` is a separate top-level field), so there's no consumer pain.
- **Fix**: either explicit `z.ZodType<XmlScores>` annotations to break inference depth, or replace `XmlScoresSchema` / `XmlStatsSchema` references in `XmlSetSchema` with `z.unknown()` so the deepest layer doesn't reference them.
- **Status**: open. **Owner**: unowned.

### Enrollment: no DB-level uniqueness on `Entries`

- **Where**: [libs/backend/database/src/models/event/entry.model.ts](../libs/backend/database/src/models/event/entry.model.ts) (no `@Unique`), [libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts](../libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts) (idempotency short-circuit).
- **What**: A team's enrollment is meant to be unique per `(teamId, subEventId)` (and even per `teamId` alone, given `Team @HasOne EventEntry`), but no DB-level `UNIQUE` constraint backs this. Idempotency for the BAD-21 fix is enforced *only* at the application layer via the `team.entry?.subEventId === subEventId` short-circuit inside a Sequelize transaction at the API's default isolation level. Two truly simultaneous submits could both pass the read-back check before either commits and produce two `EventEntry` rows for one team.
- **Why we shipped it**: BAD-21 was scoped as a bug-fix. Adding `UNIQUE(teamId)` on `event.Entries` requires a migration plus a one-time dedupe of any existing duplicates (we don't know yet whether prod has any), plus catching `SequelizeUniqueConstraintError` and translating it into the idempotent-success path. Out of scope for the bug fix; observed concurrency profile (single user clicking submit) does not warrant the change today.
- **Fix**: add a migration introducing `UNIQUE(teamId)` on `event.Entries` (or `UNIQUE(teamId, subEventId)` if product later wants multi-entry-per-team). Pre-run a dedupe SELECT to surface any colliding rows; resolve manually before applying. Update the resolver's catch path to translate `SequelizeUniqueConstraintError` into the `alreadyExisted: true` success path (matching the in-memory short-circuit). Add an integration test that fires two concurrent `createEnrollment` calls and asserts exactly one row.
- **Status**: open. **Owner**: unowned.

### Enrollment: silent cross-sub-event move on createEnrollment

- **Where**: [libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts](../libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts) — the fall-through path after the idempotency short-circuit.
- **What**: When a team already has an `EventEntry` pointing to a *different* `subEventId` than the one being submitted, the resolver silently re-attaches that entry to the new sub-event via `subEvent.addEventEntry(entry)`, and the response `alreadyExisted: false` does not distinguish "newly created" from "moved from elsewhere". This was the pre-BAD-21 behavior; BAD-21 preserved it intentionally to keep scope small.
- **Why we shipped it**: BAD-21's clarification round (Q3) explicitly closed the v1 error-code list to five values and decided to model `ALREADY_ENROLLED` as success; introducing a sixth code (`ALREADY_ENROLLED_ELSEWHERE`) here would have contradicted that decision. The cross-sub-event move semantics are also entangled with how the FE composes the enrollment UI, which this fix does not touch.
- **Fix**: decide with product whether a move should (a) stay silent, (b) require explicit `force: true` from the FE, or (c) surface as a new `ALREADY_ENROLLED_ELSEWHERE` code. Then either widen `EnrollmentResult` (e.g. `previousSubEventCompetitionId: ID | null`) or add the new code to the closed list and to the FE's translation map. Coordinate with the active frontend repo.
- **Status**: open. **Owner**: unowned.

### Enrollment: capacity-style error codes deferred from BAD-21 v1

- **Where**: [libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts](../libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts) — the closed v1 error-code list (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`, `INTERNAL_ERROR`).
- **What**: Capacity / state-of-sub-event failure modes mentioned in the BAD-21 backend-context comment — most notably `SUB_EVENT_FULL`, but also possibilities like `ENROLLMENT_WINDOW_CLOSED` — are not represented in the v1 contract. If a sub-event hits a published cap or its enrollment window expires, the current behavior is whatever `subEvent.addEventEntry` does (likely silent success, or an unrelated DB constraint failure surfacing as `INTERNAL_ERROR`).
- **Why we shipped it**: BAD-21 closed the v1 error-code list to five values to ship a small, reviewable contract. Capacity is a separate product concern with its own validation rules and its own UX. No business rule for capacity is currently configured.
- **Fix**: when product introduces enrollment caps or windows, extend the closed list (e.g. add `SUB_EVENT_FULL` with `extensions: { subEventId, capacity, currentCount }`) and add a check in the resolver before the write path. Add a corresponding case to the FE translation map and to the resolver spec.
- **Status**: open. **Owner**: unowned.

## Frontend

### Legacy Angular frontend

- **Where**: [apps/badman/](../apps/badman/), [libs/frontend/](../libs/frontend/).
- **What**: Active frontend lives in a separate repo. Per [AGENTS.md](../AGENTS.md), this code is reference-only.
- **Why we shipped it**: kept as reference during the migration to the separate frontend repo.
- **Fix**: delete both trees and their nx project references / build targets. Verify the api app's static-file serving still works for any non-frontend assets.
- **Status**: open. **Owner**: unowned.
