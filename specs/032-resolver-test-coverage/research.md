# Research: Resolver Test Coverage

**Branch**: `032-resolver-test-coverage` | **Date**: 2026-06-08

---

## R1 — Coverage command approach

**Decision**: Use `nx run-many --target=test --all --exclude=<angular-projects> --coverage --skip-nx-cache`

**Rationale**: The Angular projects (`apps/badman`, `libs/frontend/*`) each have a `jest.config.ts` using `jest-preset-angular`, which would be picked up by `getJestProjectsAsync()` in a root jest config. Angular's transformer is incompatible with the NestJS test context, causing compile errors even if `testPathIgnorePatterns` excludes test files. Using `nx run-many` with explicit `--exclude` avoids this entirely: nx knows which projects use which executors and runs each in its own context. Coverage is produced per-lib under `coverage/libs/...` and `coverage/apps/...` — standard for nx monorepos.

**Alternatives considered**:
- Root `jest.coverage.config.ts` with `getJestProjectsAsync()` + `testPathIgnorePatterns`: rejected because Angular jest configs are loaded even when no tests run, causing transformer conflicts.
- Manual project list in root config: rejected — maintenance burden every time a lib is added.

**Excluded projects** (Angular legacy):
- `badman` (`apps/badman/`)
- `frontend-models`, `frontend-components`, `frontend-html-injects`, `frontend-vitals`, `frontend-translation`, `frontend-auth`, `frontend-excel`, `frontend-pdf`, `frontend-utils`, `frontend-graphql`, `frontend-queue`, `frontend-cp`, `frontend-twizzit`, `frontend-seo`, `frontend-club`, `frontend-ranking`, `frontend-role`, `frontend-general`, `frontend-tournament`, `frontend-transfers`, `frontend-team`, `frontend-job`, `frontend-rule`, `frontend-team-assembly`, `frontend-change-encounter`, `frontend-team-enrollment`, `frontend-event`, `frontend-notifications`, `frontend-player`

The `badman-e2e`, `badman-e2e-desktop`, `badman-e2e-mobile` apps have no jest config (Playwright only) — `nx run-many --all` will skip them automatically (`passWithNoTests: true`).

**Final npm script** (`package.json`):
```json
"test:coverage:all": "nx run-many --target=test --all --coverage --skip-nx-cache --exclude=badman,frontend-models,frontend-components,frontend-html-injects,frontend-vitals,frontend-translation,frontend-auth,frontend-excel,frontend-pdf,frontend-utils,frontend-graphql,frontend-queue,frontend-cp,frontend-twizzit,frontend-seo,frontend-club,frontend-ranking,frontend-role,frontend-general,frontend-tournament,frontend-transfers,frontend-team,frontend-job,frontend-rule,frontend-team-assembly,frontend-change-encounter,frontend-team-enrollment,frontend-event,frontend-notifications,frontend-player"
```

---

## R2 — Legacy exclusion: test execution vs coverage report

**Decision**: `--exclude` flag on `nx run-many` handles test execution; each lib's jest config controls its own `coverageDirectory`. No additional `coveragePathIgnorePatterns` needed because the excluded projects never run at all.

**Rationale**: `nx run-many --exclude` prevents those projects from being invoked entirely. Coverage can only be collected for code that is tested. Since the Angular projects are never invoked, they produce no coverage data and no files appear in the output.

---

## R3 — Integration test exclusion

**Decision**: Add `testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$']` to the backend-graphql `jest.config.ts`, so it applies to both `nx test backend-graphql` and `test:coverage:all`.

**Rationale**: The pattern `*.integration.spec.ts` already guards themselves with `process.env["RUN_INTEGRATION_TESTS"] === "1"` — they skip internally. But including them in the coverage run could still add startup time. Adding the ignore pattern is clean and has no side effects. The coverage command does not pass `RUN_INTEGRATION_TESTS=1`, so integration tests are double-skipped.

---

## R4 — Coverage reporters (lcov + text)

**Decision**: Set `coverageReporters: ['text', 'lcov']` in each non-legacy lib's jest config **only when running coverage**. Since this is an nx monorepo and each project has its own jest config, the coverage reporter is already configured at the lib level. No root-level change is needed.

**Rationale**: `text` prints the table to console. `lcov` writes `lcov.info` under each lib's `coverageDirectory`. CI tools (Codecov, SonarCloud) can consume multiple lcov files by globbing `coverage/**/lcov.info`.

**Output locations** (per lib, example):
- `coverage/libs/backend/graphql/lcov.info`
- `coverage/libs/backend/database/lcov.info`
- `coverage/apps/api/lcov.info`

**Note**: The backend-graphql jest config already has `coverageDirectory: '../../../coverage/libs/backend/graphql'`. Adding `coverageReporters` to it is sufficient.

---

## R5 — Provider injection map per resolver (TestingModule stubs)

| Resolver | Injected dependencies | Stub strategy |
|----------|----------------------|---------------|
| `availability.resolver.ts` | `Sequelize` | `{ transaction: jest.fn() }` |
| `club-membership.resolver.ts` | none (no constructor) | `providers: [ClubPlayerMembershipsResolver]` only |
| `cronJob.resolver.ts` | `Sequelize`, `CronService` | Sequelize stub + `{ listCrons: jest.fn(), updateCron: jest.fn() }` |
| `assembly.resolver.ts` | `AssemblyValidationService`, `RankingSystemService` | Both as object stubs; NO Sequelize |
| `encounter-change.resolver.ts` | `Sequelize`, `Queue (SyncQueue)`, `NotificationService`, `EncounterValidationService` | Sequelize stub + `getQueueToken(SyncQueue)` → `{ add: jest.fn() }` + service stubs |
| `event/competition/event.resolver.ts` | `Sequelize`, `PointsService`, `Queue (SyncQueue)`, `RankingSystemService` | All stubbed |
| `event/tournament/draw.resolver.ts` | `Sequelize`, `PointsService`, `Queue (SyncQueue)`, `RankingSystemService` | All stubbed |
| `event/tournament/event.resolver.ts` | `Sequelize`, `PointsService`, `Queue (SyncQueue)`, `RankingSystemService` | All stubbed |
| `event/tournament/subevent.resolver.ts` | `Sequelize`, `PointsService`, `Queue (SyncQueue)`, `RankingSystemService` | All stubbed |
| `faq.resolver.ts` | `Sequelize` | `{ transaction: jest.fn() }` |
| `notification.resolver.ts` | `Sequelize` | `{ transaction: jest.fn() }` |
| `rankingSystemGroup.resolver.ts` | `Sequelize`, `PointsService` | Both stubbed |
| `claim.resolver.ts` | `Sequelize` | `{ transaction: jest.fn() }` |
| `role.resolver.ts` | `Sequelize` | `{ transaction: jest.fn() }` |
| `service.resolver.ts` | none (no constructor) | `providers: [ServiceResolver]` only |

**Bull queue injection pattern** (from existing tests in this codebase):
```typescript
import { getQueueToken } from '@nestjs/bull';
import { SyncQueue } from '@badman/backend-queue';

// In TestingModule providers:
{ provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } }
```

---

## R6 — Coverage threshold approach

**Decision**: Add `coverageThreshold` to `libs/backend/graphql/jest.config.ts` only (the primary lib being tested). Start at 0% across all metrics. Measure after implementation and pin to actual value rounded down to nearest 5%.

**Rationale**: Adding thresholds to all libs would fail CI for libs that have no tests (e.g., pure model/type libs). Scoping to `backend-graphql` targets exactly the lib this feature improves. Other libs can have thresholds added as their own test coverage improves in future features.

**Configuration snippet** (added to `libs/backend/graphql/jest.config.ts`):
```typescript
coverageThreshold: {
  global: {
    lines: 0,       // PLACEHOLDER — update after first run
    branches: 0,    // PLACEHOLDER
    functions: 0,   // PLACEHOLDER
    statements: 0,  // PLACEHOLDER
  },
},
coverageReporters: ['text', 'lcov'],
```
