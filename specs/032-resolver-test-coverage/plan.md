# Implementation Plan: Resolver Test Coverage

**Branch**: `032-resolver-test-coverage` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/032-resolver-test-coverage/spec.md`

## Summary

Add unit test files for the 15 GraphQL resolvers currently missing `.resolver.spec.ts` files in `libs/backend/graphql`. Tests are written contract-first (from method signatures and GraphQL types, not by reading the implementation). A second pass validates implementation details. In parallel, produce a committed `audit.md` covering all 33 resolvers, and wire a `test:coverage:all` npm script that runs every non-legacy test suite with lcov + text reporting and an enforced coverage threshold.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 20)  
**Primary Dependencies**: NestJS, `@nestjs/testing`, Jest (via `@nx/jest`), Sequelize-typescript, `@badman/backend-database`, `@badman/backend-authorization`  
**Storage**: PostgreSQL via Sequelize (mocked in tests — no real DB)  
**Testing**: Jest, configured per-lib via `jest.config.ts`; root `jest.config.ts` uses `getJestProjectsAsync()`; preset in `jest.preset.js`  
**Target Platform**: Node 20, Linux CI (GitHub Actions)  
**Project Type**: NestJS Nx monorepo — backend GraphQL lib  
**Performance Goals**: New test suite must not add more than 60 s to baseline wall-clock  
**Constraints**: No real DB or Redis; all mocks in-memory; `forceExit: true` already set in preset  
**Scale/Scope**: 15 new `.resolver.spec.ts` files; 1 new `jest.coverage.config.ts`; 1 `audit.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I — Code-First GraphQL** | ✅ Pass | No new models or SDL; tests only |
| **II — Translation Discipline** | ✅ Pass | No i18n changes |
| **III — Transactional Mutations** | ✅ Pass | Tests *verify* the transaction pattern; no mutations added |
| **IV — Resolver Test Discipline** | ✅ Primary target | This PR closes the test gap |
| **V — Legacy Frontend Boundary** | ✅ Pass | Coverage command explicitly excludes `apps/badman/` and `libs/frontend/` |

No violations. No Complexity Tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/032-resolver-test-coverage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── audit.md             # Committed audit artifact (produced during implementation)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# New test files (co-located with resolvers)
libs/backend/graphql/src/resolvers/
├── availability/
│   └── availability.resolver.spec.ts          [NEW]
├── club/
│   └── club-membership.resolver.spec.ts       [NEW]
├── cronJobs/
│   └── cronJob.resolver.spec.ts               [NEW]
├── event/competition/
│   ├── assembly.resolver.spec.ts              [NEW]
│   ├── encounter-change.resolver.spec.ts      [NEW]
│   └── event.resolver.spec.ts                 [NEW]
├── event/tournament/
│   ├── draw.resolver.spec.ts                  [NEW]
│   ├── event.resolver.spec.ts                 [NEW]
│   └── subevent.resolver.spec.ts              [NEW]
├── faq/
│   └── faq.resolver.spec.ts                   [NEW]
├── notification/
│   └── notification.resolver.spec.ts          [NEW]
├── ranking/
│   └── rankingSystemGroup.resolver.spec.ts    [NEW]
├── security/
│   ├── claim.resolver.spec.ts                 [NEW]
│   └── role.resolver.spec.ts                  [NEW]
└── services/
    └── service.resolver.spec.ts               [NEW]

# Coverage configuration
jest.coverage.config.ts                        [NEW]

# Package script update
package.json                                   [UPDATE — add test:coverage:all]

# Documentation updates
AGENTS.md                                      [UPDATE — coverage threshold docs]
```

**Structure Decision**: All test files co-located beside their resolver source per Constitution Principle IV and CLAUDE.md resolver test convention. Coverage config is a separate root-level file rather than modifying the shared `jest.config.ts`, so the coverage command is opt-in and does not slow normal `nx test` runs.

---

## Phase 0: Research

**Output**: `specs/032-resolver-test-coverage/research.md`

### Research questions

1. **Coverage config approach**: Should the `test:coverage:all` script use `nx run-many --target=test --all --coverage` filtered by project tags, or a dedicated root `jest.coverage.config.ts` that calls `getJestProjectsAsync()` with path-based exclusions?

2. **Legacy exclusion mechanism**: Jest `testPathIgnorePatterns` vs `coveragePathIgnorePatterns` — which must be set and where to ensure `apps/badman/` and `libs/frontend/` are absent from both test execution and the coverage report?

3. **Integration test exclusion**: The preset already has `passWithNoTests: true`. Confirm that adding `testPathIgnorePatterns: ['integration\\.spec\\.ts']` in the coverage config is sufficient to skip integration tests without affecting normal runs.

4. **lcov + text reporters**: Confirm `coverageReporters: ['text', 'lcov']` works with `@nx/jest` and `ts-jest`; identify the output directory for the lcov file.

5. **Resolver dependency injection audit**: For each of the 15 resolvers, what NestJS providers (beyond `Sequelize`) must be added to `Test.createTestingModule`? Some resolvers inject Bull queue services, ranking services, or loader services that will need stubs.

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### Data model

No new persistent entities. The key "entities" for this feature are test infrastructure types:

| Concept | Type | Description |
|---------|------|-------------|
| `MockTransaction` | Local type | `{ commit: jest.Mock; rollback: jest.Mock }` |
| `UserWithPermission` | Helper fn | Returns `Player` stub with `hasAnyPermission: jest.fn().mockResolvedValue(allowed)` |
| `ModelSpy` | jest.SpyInstance | `jest.spyOn(Model, 'staticMethod')` — restored in `afterEach` |
| Provider stub | Object literal | Minimal stub for injected services (queue, loader, ranking service) |

See `data-model.md` for the per-resolver provider map (injected services per resolver → stub shape).

### Test structure per resolver (standard template)

```typescript
describe('<Name>Resolver', () => {
  let resolver: <Name>Resolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({ hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        <Name>Resolver,
        { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
        // ... resolver-specific service stubs
      ],
    }).compile();
    resolver = module.get(<Name>Resolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // --- Queries ---
  it('returns data on happy path', ...)
  it('returns null/[] when not found', ...)

  // --- Mutations (write operations) ---
  it('throws UnauthorizedException for unauthorized user', ...)
  it('throws NotFoundException when entity not found', ...)
  it('commits transaction on success', ...)
  it('rolls back transaction on error', ...)

  // --- ResolveFields ---
  it('<fieldName>: returns associated entity', ...)
});
```

### Coverage command design

**File**: `jest.coverage.config.ts` (root)

```typescript
import { getJestProjectsAsync } from '@nx/jest';

export default async () => ({
  projects: await getJestProjectsAsync(),
  testPathIgnorePatterns: [
    '/node_modules/',
    'apps/badman/',
    'libs/frontend/',
    '\\.integration\\.spec\\.ts$',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'apps/badman/',
    'libs/frontend/',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: '<rootDir>/coverage/all',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      lines: 0,       // PLACEHOLDER — update after first run (see AGENTS.md)
      branches: 0,    // PLACEHOLDER
      functions: 0,   // PLACEHOLDER
      statements: 0,  // PLACEHOLDER
    },
  },
});
```

**npm script** (`package.json`):
```json
"test:coverage:all": "npx jest --config jest.coverage.config.ts --forceExit"
```

### Audit document structure

`specs/032-resolver-test-coverage/audit.md` sections:

1. **Summary** — total findings by category
2. **Missing Authorization** — resolvers that write without `user.hasAnyPermission()`
3. **Duplication** — near-identical logic blocks across resolvers
4. **Performance Quick Wins** — N+1-prone field resolvers lacking dataloader usage; sequential queries that could be batched
5. **Code Quality** — structural issues (dead code, inconsistent error handling, logging gaps)
6. **Bugs** — behavioral discrepancies found during first-pass testing
7. **Deferred Follow-up** — findings requiring a separate feature spec (linked when created)

Each finding: `| Category | File | Line | Issue | Suggested Remedy | Status |`

### Agent context update

Update the `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block in `CLAUDE.md` / `AGENTS.md` to reference `specs/032-resolver-test-coverage/plan.md`.

Also add to `AGENTS.md` under **Common Commands**:

```bash
# Run full coverage report (all non-legacy libs, no DB required)
npm run test:coverage:all

# Update coverage threshold after adding tests:
# 1. Run: npm run test:coverage:all
# 2. Note the "Lines" % from the console summary
# 3. Round down to nearest 5%
# 4. Update coverageThreshold.global.* in jest.coverage.config.ts
# 5. Commit the change
```

---

## Complexity Tracking

No constitution violations. No complexity tracking required.
