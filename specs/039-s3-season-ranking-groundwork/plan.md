# Implementation Plan: Season and Ranking Reference-Date Groundwork

**Branch**: `docs/s3-groundwork-spec` (plan); implementation per ticket off `feat/refactor` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/039-s3-season-ranking-groundwork/spec.md`
**Tickets**: BAD-409 (characterization tests, done), BAD-390 (US1), BAD-391 (US2), BAD-392 (US3); parent BAD-362

## Summary

Give the backend one tested home for season concepts and for the ranking reference date, and one lookup for "a player's place at date X for ranking system Y". Behaviour stays the same except for the named bug fixes and one intended timezone change (see research R2).

Approach:

1. **US1**: a pure module in `@badman/utils` (`date-fns` + `date-fns-tz`, Europe/Brussels). The old `comp.ts` helpers delegate to it with the process-local timezone.
2. **US2**: move every caller to the module, fix the two change-request bugs, remove the old helpers.
3. **US3**: calendar-date reference functions plus a portable batch lookup in `@badman/backend-database`. The four callers pass their current rule explicitly. The sync worker gets a system filter, and the line-up cache key includes season and system.

Production runs with `TZ=Europe/Brussels` (research R1). The module computes in Brussels explicitly, so results no longer depend on the server timezone, and database-facing instants stay at midnight in Brussels, the values production stores today (research R3).

## Technical Context

**Language/Version**: TypeScript 5.8, Node 22
**Primary Dependencies**: NestJS 11, Sequelize 6 (sequelize-typescript), `date-fns` 4 + `date-fns-tz` 3 (already in the repo; added to `@badman/utils`), moment (only in code this feature does not touch; removed in BAD-380)
**Storage**: PostgreSQL (production, dev); SQLite in-memory for some unit specs. No schema change.
**Testing**: Jest via `turbo run test`; characterization tests from BAD-409; integration tests gated behind `RUN_INTEGRATION_TESTS=1`; tests run in Europe/Brussels like production, with a UTC run (`jest.also-run-in-timezone.ts`) for code that must not depend on the server timezone
**Target Platform**: Render (Linux, Node), API and Bull workers
**Project Type**: Backend monorepo (Turborepo + pnpm), internal packages
**Performance Goals**: Lookups stay one query per call (batch over players); no extra queries per player
**Constraints**: GraphQL schema unchanged (FR-017); same results as today except FR-007, FR-008, FR-014, FR-015 and the boundary-instant change from R2; must run on Postgres and SQLite
**Scale/Scope**: ~15 caller files across 8 packages, 4 ranking lookups, seeders

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status |
| --- | --- | --- |
| I. Code-first GraphQL via Sequelize models | No new entities; models unchanged | ✅ Pass |
| II. Translation discipline | No i18n changes. If an error message ever needs a new key, it goes through `translation-manager` | ✅ Pass |
| III. Transactional mutations | The change-request mutations keep their transaction and permission checks; only the season and deadline checks before the transaction change | ✅ Pass |
| IV. Resolver test discipline | New and changed tests are co-located `*.spec.ts`; resolver tests keep the mocked-statics pattern; integration tests stay opt-in | ✅ Pass |
| V. Frontend in a separate repository | No frontend code | ✅ Pass |
| Stack constraints | No new libraries (date-fns/date-fns-tz already used); Turborepo/pnpm; `workspace:*` deps only | ✅ Pass |
| Workflow | Branches off `feat/refactor` per team decision (refactor exception to "branch from develop"); `turbo run lint test` per package | ✅ Pass (documented exception) |

**Post-design re-check**: still passes. The lookup is a query function, not a model or resolver. No mutation changes its transaction shape.

## Project Structure

### Documentation (this feature)

```text
specs/039-s3-season-ranking-groundwork/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── season-module.md
│   └── ranking-lookup.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/utils/src/lib/season/            # US1 + US3 reference dates (new)
├── calendar.ts                           # CalendarDate, toCalendarDate, storedInstant, brusselsDayRange
├── season.ts                             # enrollmentSeason, competitionSeasonWindow, seasonHalf, membership…, score-entry, nextSeason, twizzitExportWindow
├── ranking-dates.ts                      # enrollmentRankingDate, encounterRankingDate, lineUpRankingWindow
├── index.ts
└── *.spec.ts                             # run in Europe/Brussels and UTC
packages/utils/src/lib/comp.ts            # US1: delegates; US2: removed

packages/backend-database/src/queries/    # US3 (new)
└── latest-ranking-places.ts (+ .spec.ts on SQLite)

# US2 callers
packages/backend-graphql/src/resolvers/event/competition/encounter-change.service.ts
packages/backend-graphql/src/resolvers/player/player.resolver.ts
packages/backend-competition/change-encounter/src/services/validate/{encounter.service.ts,rules/semester.rule.ts,rules/team-club.rule.ts,rules/dates-in-period.ts}
packages/backend-competition/enrollment/src/services/validate/{enrollment.service.ts,rules/player-club.rule.ts}
packages/backend-competition/transfer-loans/src/services/{transfers.service.ts,loans.service.ts.ts}
packages/backend-twizzit/src/services/game-export/game-export.service.ts
apps/worker/sync/src/app/processors/enter-scores/guards.ts
database/seeders/**, packages/backend-database/src/_testing/load-test.ts

# US3 callers
packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.ts
packages/backend-competition/assembly/src/services/export/export.service.ts
packages/backend-competition/assembly/src/services/validate/assembly.service.ts
apps/worker/sync/src/app/processors/sync-events/competition-sync/processors/entry.ts
```

**Structure Decision**: pure date logic in `@badman/utils` (every caller already depends on it); the database lookup in `@badman/backend-database` (enrollment and assembly do not depend on `backend-ranking`). See research R5.

## Delivery order

1. **BAD-409** (done, #1176 and follow-up #1181): characterization tests and integration fixture; tests run in Europe/Brussels like production.
2. **BAD-390 / US1**: module + tests in both timezones; `comp.ts` delegates. No caller changes.
3. **BAD-391 / US2**: callers move to the module; FR-007 and FR-008 fixed with failing tests first; old helpers removed. The `moment.tz.setDefault` side effect is a separate bug (BAD-410).
4. **BAD-392 / US3**: reference dates + lookup; callers switch; FR-014 and FR-015 fixed with failing tests first.

Each ticket is its own branch and PR into `feat/refactor`, stacked on the previous one while reviews are pending. US3 only needs US1, so BAD-391 and BAD-392 can run in parallel after BAD-390.

## Open items

- **Production timezone (checked 2026-11-25)**: Europe/Brussels on the API and both workers (research R1). FR-010a now describes timezone independence, not a change in production.
- **Production checks (done 2026-11-25)**: about 90% of stored ranking dates and memberships are at midnight in Brussels, the rest at midnight UTC with the same results (research R3); every event uses `months`/4 (research R7).

## Complexity Tracking

No constitution violations to justify.
