# Technical debt registry

<!--
Versions (newest first):
- v1.5 — 2026-06-10 — Resolve "Legacy Angular frontend" (deleted in feature
  036, the Nx→Turborepo cutover). Add "Turborepo migration deferrals" entry.
  Update all moved paths (libs/* → packages/*).
- v1.4 — 2026-05-21 — Add "Enrollment validation: cross-request caching deferred" from feat-028.
- v1.3 — 2026-05-05 — Remove "Team: teamNumber auto-increment race on createTeam"
  (spec 008, BAD-152). The race still exists for the placeholder number assigned
  by createTeam, but a duplicate placeholder is no longer a numbering risk because
  recalculateTeamNumbersForGroup overwrites all placeholder numbers with
  rank-correct values the first time the wizard calls it. The entry is no longer
  tracking a user-visible hazard.
- v1.2 — 2026-04-30 — Add three team-resolver entries from
  002-team-resolver-improvements: no DB uniqueness on `Teams(link, season)`
  (narrow concurrent-write window), pre-existing `teamNumber`
  auto-increment race intentionally out of scope, FE migration of
  `createTeam` callers tracked in Linear BAD-128.
- v1.1 — 2026-04-29 — Add three BAD-21 backend entries: no DB-level
  uniqueness on Entries (narrow concurrent-write window), silent
  cross-sub-event move on createEnrollment, deferred capacity-error codes
  (SUB_EVENT_FULL etc.).
- v1.0 — 2026-04-27 — Initial registry: three seed entries (Visual API
  date duality, XmlScores/XmlStats z.unknown(), legacy Angular frontend).
-->

## How to use

- **Add** an entry the same commit you ship a _knowing_ compromise. Don't add things you'd routinely fix in a small refactor.
- **Remove** an entry in the same commit that resolves the debt. Stale entries are worse than missing ones.
- **Required fields** per entry: where, what, why we shipped it, fix effort + trigger to revisit. Skip the rest.
- **Add a row** to the table below for every entry, in the same order. Sort within each Area by impact (worst first).
- **Bump the version** at the top when you add, remove, or materially edit an entry.

## Debt table

| Title                                                                                                                            | Area     | Where                                                                                                                                          | Effort                           | Trigger to revisit                                                                                                           | Status |
| -------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| [Visual API: schema/interface duality on Date fields](#visual-api-schemainterface-duality-on-date-fields)                        | Backend  | `packages/backend-visual/src/utils/visual-result.ts`                                                                                           | ~1 day                           | New Visual date field, or sync regression from a date-format change                                                          | open   |
| [Visual API: XmlScores / XmlStats kept as z.unknown()](#visual-api-xmlscores--xmlstats-kept-as-zunknown)                         | Backend  | `packages/backend-visual/src/utils/visual-result.ts`                                                                                           | ~half day                        | First feature that actually reads `.Scores.Score` / `.Stats.Stat`                                                            | open   |
| [Enrollment: no DB-level uniqueness on `Entries`](#enrollment-no-db-level-uniqueness-on-entries)                                 | Backend  | `packages/backend-database/src/models/event/entry.model.ts`, `packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts` | ~half day                        | First observed duplicate-entry incident in prod, OR a contention bug report on the enrollment-submit flow                    | open   |
| [Enrollment: silent cross-sub-event move on createEnrollment](#enrollment-silent-cross-sub-event-move-on-createenrollment)       | Backend  | `packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts`                                                              | ~half day (BE) + FE coordination | Product asks why teams "disappear" from one sub-event after re-enrolling into another                                        | open   |
| [Enrollment: capacity-style error codes deferred from BAD-21 v1](#enrollment-capacity-style-error-codes-deferred-from-bad-21-v1) | Backend  | `packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts`                                                              | ~quarter day per code            | First product/UX request for "sub-event full" feedback, or first time a sub-event hits a published cap                       | open   |
| [Team: no DB uniqueness on `Teams(link, season)`](#team-no-db-uniqueness-on-teamslink-season)                                    | Backend  | `packages/backend-database/src/models/team.model.ts`, `packages/backend-graphql/src/resolvers/team/team.resolver.ts`                           | ~half day                        | First observed duplicate `(link, season)` team in prod, OR a contention bug report on the team-create / season-rollover flow | open   |
| [Team: FE migration of `createTeam` callers (BAD-128)](#team-fe-migration-of-createteam-callers-bad-128)                         | Frontend | active frontend repo (separate); pointer only here                                                                                             | tracked in Linear                | BAD-128 closes                                                                                                               | open   |
| [Enrollment validation: cross-request caching deferred](#enrollment-validation-cross-request-caching-deferred)                   | Backend  | `packages/backend-competition/enrollment/src/services/cache/enrollment-validation-cache.service.ts`                                            | ~1–2 days                        | First complaint that repeated `enrollmentValidation(validate: true)` calls are slow across separate GraphQL requests         | open   |
| [Turborepo migration deferrals (feature 036)](#turborepo-migration-deferrals-feature-036)                                        | Backend  | `turbo.json`, root `package.json`, `eslint.config.js`                                                                                          | 3 small PRs                      | CI slowness (remote cache), nestjs-i18n upgrade need, or lint-tightening push                                                | open   |

---

## Backend

### Visual API: schema/interface duality on Date fields

- **Where**: [packages/backend-visual/src/utils/visual-result.ts](../packages/backend-visual/src/utils/visual-result.ts) — `XmlTournament`, `XmlMatch`, `XmlTeamMatch`, `XmlItem` interfaces vs their `*Schema` zod schemas.
- **What**: ~16 date fields (`StartDate`, `EndDate`, `MatchTime`, `LastUpdated`, the various `*PublicationDate` fields) are typed as `Date` in the consumer-facing interfaces but as `string` in the runtime schemas.
- **Why we shipped it**: collapsing to one source of truth means either (a) transforming strings → Date in the schema, or (b) updating ~20 consumer call sites in worker-sync that assign these fields to Sequelize `Date` columns. Out of scope for the validation rollout. Not actively buggy — the one case that _was_ (broken `PublicationDate`) is fixed.
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
  Replace `z.string().optional()` with `xmlDate` on the date fields. Drop the legacy interfaces; let `z.infer` give consumers `Date | null`. Update [event.processor.ts](../apps/worker/sync/src/app/processors/sync-events-v2/tournament/processors/event.processor.ts) for the `null` case. Rewrite affected tests in [visual.service.spec.ts](../packages/backend-visual/src/services/__tests__/visual.service.spec.ts) to expect `Date` instances.
- **Status**: open. **Owner**: unowned.

### Visual API: XmlScores / XmlStats kept as z.unknown()

- **Where**: [packages/backend-visual/src/utils/visual-result.ts](../packages/backend-visual/src/utils/visual-result.ts) — `XmlScoresSchema.Score`, `XmlStatsSchema.Stat`.
- **What**: inner field is `z.unknown()`; the legacy `XmlScores` / `XmlStats` interfaces still live alongside the schemas. Every other wrapper (`XmlPlayers`, `XmlStructure`, `XmlSets`) was unified in `58bfc2456`.
- **Why we shipped it**: `arrayOf(XmlScoreSchema)` / `arrayOf(XmlStatSchema)` re-trip TS7056 ("inferred type exceeds maximum length") because the recursion `XmlMatch → XmlSets → XmlSet → XmlScores` is too deep. Nothing reads `.Score` or `.Stat` today (`ScoreStatus` is a separate top-level field), so there's no consumer pain.
- **Fix**: either explicit `z.ZodType<XmlScores>` annotations to break inference depth, or replace `XmlScoresSchema` / `XmlStatsSchema` references in `XmlSetSchema` with `z.unknown()` so the deepest layer doesn't reference them.
- **Status**: open. **Owner**: unowned.

### Enrollment: no DB-level uniqueness on `Entries`

- **Where**: [packages/backend-database/src/models/event/entry.model.ts](../packages/backend-database/src/models/event/entry.model.ts) (no `@Unique`), [packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts](../packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts) (idempotency short-circuit).
- **What**: A team's enrollment is meant to be unique per `(teamId, subEventId)` (and even per `teamId` alone, given `Team @HasOne EventEntry`), but no DB-level `UNIQUE` constraint backs this. Idempotency for the BAD-21 fix is enforced _only_ at the application layer via the `team.entry?.subEventId === subEventId` short-circuit inside a Sequelize transaction at the API's default isolation level. Two truly simultaneous submits could both pass the read-back check before either commits and produce two `EventEntry` rows for one team.
- **Why we shipped it**: BAD-21 was scoped as a bug-fix. Adding `UNIQUE(teamId)` on `event.Entries` requires a migration plus a one-time dedupe of any existing duplicates (we don't know yet whether prod has any), plus catching `SequelizeUniqueConstraintError` and translating it into the idempotent-success path. Out of scope for the bug fix; observed concurrency profile (single user clicking submit) does not warrant the change today.
- **Fix**: add a migration introducing `UNIQUE(teamId)` on `event.Entries` (or `UNIQUE(teamId, subEventId)` if product later wants multi-entry-per-team). Pre-run a dedupe SELECT to surface any colliding rows; resolve manually before applying. Update the resolver's catch path to translate `SequelizeUniqueConstraintError` into the `alreadyExisted: true` success path (matching the in-memory short-circuit). Add an integration test that fires two concurrent `createEnrollment` calls and asserts exactly one row.
- **Status**: open. **Owner**: unowned.

### Enrollment: silent cross-sub-event move on createEnrollment

- **Where**: [packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts](../packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts) — the fall-through path after the idempotency short-circuit.
- **What**: When a team already has an `EventEntry` pointing to a _different_ `subEventId` than the one being submitted, the resolver silently re-attaches that entry to the new sub-event via `subEvent.addEventEntry(entry)`, and the response `alreadyExisted: false` does not distinguish "newly created" from "moved from elsewhere". This was the pre-BAD-21 behavior; BAD-21 preserved it intentionally to keep scope small.
- **Why we shipped it**: BAD-21's clarification round (Q3) explicitly closed the v1 error-code list to five values and decided to model `ALREADY_ENROLLED` as success; introducing a sixth code (`ALREADY_ENROLLED_ELSEWHERE`) here would have contradicted that decision. The cross-sub-event move semantics are also entangled with how the FE composes the enrollment UI, which this fix does not touch.
- **Fix**: decide with product whether a move should (a) stay silent, (b) require explicit `force: true` from the FE, or (c) surface as a new `ALREADY_ENROLLED_ELSEWHERE` code. Then either widen `EnrollmentResult` (e.g. `previousSubEventCompetitionId: ID | null`) or add the new code to the closed list and to the FE's translation map. Coordinate with the active frontend repo.
- **Status**: open. **Owner**: unowned.

### Enrollment: capacity-style error codes deferred from BAD-21 v1

- **Where**: [packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts](../packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts) — the closed v1 error-code list (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`, `INTERNAL_ERROR`).
- **What**: Capacity / state-of-sub-event failure modes mentioned in the BAD-21 backend-context comment — most notably `SUB_EVENT_FULL`, but also possibilities like `ENROLLMENT_WINDOW_CLOSED` — are not represented in the v1 contract. If a sub-event hits a published cap or its enrollment window expires, the current behavior is whatever `subEvent.addEventEntry` does (likely silent success, or an unrelated DB constraint failure surfacing as `INTERNAL_ERROR`).
- **Why we shipped it**: BAD-21 closed the v1 error-code list to five values to ship a small, reviewable contract. Capacity is a separate product concern with its own validation rules and its own UX. No business rule for capacity is currently configured.
- **Fix**: when product introduces enrollment caps or windows, extend the closed list (e.g. add `SUB_EVENT_FULL` with `extensions: { subEventId, capacity, currentCount }`) and add a check in the resolver before the write path. Add a corresponding case to the FE translation map and to the resolver spec.
- **Status**: open. **Owner**: unowned.

### Team: no DB uniqueness on `Teams(link, season)`

- **Where**: [packages/backend-database/src/models/team.model.ts](../packages/backend-database/src/models/team.model.ts) (no `@Unique` on `(link, season)`), [packages/backend-graphql/src/resolvers/team/team.resolver.ts](../packages/backend-graphql/src/resolvers/team/team.resolver.ts) (idempotency short-circuit). The legacy `teams_unique_constraint` on `(clubId, teamNumber, type)` was dropped entirely in `database/migrations/20230520140833-removing teams constraint.js`; there is currently no DB-level uniqueness on the `Teams` table.
- **What**: A team is meant to be unique per `(link, season)` (the cross-season continuity key plus the season). The `002-team-resolver-improvements` change enforces this _only_ at the application layer via `Team.findOne({ where: { link, season } })` inside a Sequelize transaction at the API's default isolation level. Two truly simultaneous `createTeam` calls for the same `(link, season)` could both pass the read-back check before either commits and produce two team rows.
- **Why we shipped it**: scoped as a contract/idempotency fix, not a schema change. Adding a `UNIQUE` partial index requires a migration plus a one-time dedupe of any existing duplicates (we don't know yet whether prod has any), plus catching `SequelizeUniqueConstraintError` and translating it into the idempotent-success path. Out of scope for this fix; observed concurrency profile (single user clicking submit) does not warrant the change today. Mirrors the BAD-21 enrollment decision.
- **Fix**: add a migration introducing `CREATE UNIQUE INDEX teams_link_season_unique ON public."Teams" (link, season) WHERE link IS NOT NULL`. Pre-run a dedupe SELECT to surface any colliding rows; resolve manually before applying. Update the resolver's catch path to translate `SequelizeUniqueConstraintError` into the `alreadyExisted: true` success path (re-fetching by `(link, season)` to populate `teamId` / `clubId`). Add an integration test that fires two concurrent `createTeam` calls and asserts exactly one row.
- **Status**: open. **Owner**: unowned.

### Enrollment validation: cross-request caching deferred

- **Where**: `packages/backend-competition/enrollment/src/services/cache/enrollment-validation-cache.service.ts`. Reference: `specs/028-gate-enrollment-validation/`.
- **What**: `EnrollmentValidationCacheService` collapses duplicate `(clubId, season)` lookups _within a single GraphQL request_ (DataLoader-style) but has no cross-request cache. A second `enrollmentValidation(validate: true)` call in a separate request recomputes the full club-wide validation from scratch.
- **Why we shipped it**: the primary goal of feat-028 was to eliminate unwanted computation entirely (default `null`). Cross-request caching is out of scope per spec (research R-003); it requires cache-invalidation semantics (enrollment changes, player-roster edits, team-delete) that carry meaningful coordination risk.
- **Fix**: introduce a TTL-backed Redis cache keyed on `(clubId, season, systemId)`; invalidate on `createEnrollment`, `updateTeam`, and player-roster mutations. Assess cache-stampede risk under concurrent enrollment wizard sessions.
- **Status**: open. **Owner**: unowned.

### Enrollment validation: cross-request caching deferred

- **Where**: `packages/backend-competition/enrollment/src/services/cache/enrollment-validation-cache.service.ts`. Reference: `specs/028-gate-enrollment-validation/`.
- **What**: `EnrollmentValidationCacheService` collapses duplicate `(clubId, season)` lookups _within a single GraphQL request_ (DataLoader-style) but has no cross-request cache. A second `enrollmentValidation(validate: true)` call in a separate request recomputes the full club-wide validation from scratch.
- **Why we shipped it**: the primary goal of feat-028 was to eliminate unwanted computation entirely (default `null`). Cross-request caching is out of scope per spec (research R-003); it requires cache-invalidation semantics (enrollment changes, player-roster edits, team-delete) that carry meaningful coordination risk.
- **Fix**: introduce a TTL-backed Redis cache keyed on `(clubId, season, systemId)`; invalidate on `createEnrollment`, `updateTeam`, and player-roster mutations. Assess cache-stampede risk under concurrent enrollment wizard sessions.
- **Status**: open. **Owner**: unowned.

### Turborepo migration deferrals (feature 036)

- **Where**: repo tooling — `turbo.json`, root `package.json`, `eslint.config.js`.
- **What**: three knowing deferrals from the Nx→Turborepo cutover: (1) no
  remote/shared Turborepo cache (local cache only, per spec FR-018); (2)
  `nestjs-i18n` pinned `~10.5.1` because 10.8.x's stricter `translate()` key
  typing breaks `backend-assembly` — upgrading is a standalone change with its
  own type fixes; (3) `@typescript-eslint/no-explicit-any` downgraded to warn
  and `no-require-imports` off, matching the old @nx/typescript baseline
  (FR-004 lint parity) instead of typescript-eslint 8 recommended.
- **Why we shipped it**: the migration's contract was parity, not upgrades;
  each deferral is an independent improvement with its own blast radius.
- **Fix**: (1) adopt Turborepo Remote Cache when CI time hurts; (2) bump
  nestjs-i18n + fix key typings; (3) re-tighten lint rules and fix the ~9
  violations. Each is a small standalone PR.
- **Status**: open. **Owner**: unowned.

## Frontend

### Team: FE migration of `createTeam` callers (BAD-128)

- **Where**: active frontend repository (separate from this repo). Linear: [BAD-128](https://linear.app/dashdot/issue/BAD-128). Cross-reference: [`docs/enrollment-old-vs-new.md`](enrollment-old-vs-new.md) §10 (mutations) and §13 already flag the missing `createTeams` step in the new flow — BAD-128 is the work that lands those changes.
- **What**: `002-team-resolver-improvements` changes the `createTeam` (and `createTeams`) GraphQL return type from `Team` to `TeamResult { teamId, clubId, alreadyExisted }`, and removes the upsert-on-find behavior (existing teams are no longer updated by `createTeam`). All FE call sites must (a) update their selection sets to `TeamResult`, (b) follow up with `updateTeam` when `alreadyExisted: true` is returned and the caller intends to apply changes, and (c) map the new `extensions.code` values (`CLUB_NOT_FOUND`, `PERMISSION_DENIED`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`, `INTERNAL_ERROR`) to localized copy.
- **Why we shipped it**: keeping the upsert path inside `createTeam` would have duplicated `updateTeam`'s responsibilities and made idempotency semantics inconsistent with the BAD-21 enrollment fix. The breakage is intentional; FE migration is a coordinated rollout in the active frontend repo.
- **Fix**: complete BAD-128. When closed, delete this entry.
- **Status**: open. **Owner**: tracked in Linear.
