# Feature Specification: Resolver Test Coverage

**Feature Branch**: `032-resolver-test-coverage`  
**Created**: 2026-06-08  
**Status**: Draft  
**Input**: User description: "write tests for all of our resolvers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Security resolvers tested (Priority: P1)

Developers can trust that the claim and role resolvers behave correctly under authorized and unauthorized access — covering queries, mutations, and field resolution.

**Why this priority**: Security resolvers directly guard access control. A regression here has platform-wide impact.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="claim|role"` and see passing tests for both resolvers.

**Acceptance Scenarios**:

1. **Given** an unauthorized user, **When** a mutation is called on `claim` or `role` resolver, **Then** an `UnauthorizedException` is thrown and no data is written.
2. **Given** an authorized user, **When** `assignClaim` / `assignClaims` / `createRole` / `updateRole` / `deleteRole` / `addPlayerToRole` / `removePlayerFromRole` / `updateRolePlayers` are called, **Then** the mutation succeeds and the transaction is committed.
3. **Given** valid IDs, **When** `claim`, `claims`, `role`, `roles` queries are called, **Then** data is returned.
4. **Given** an invalid or missing ID, **When** a query by ID is called, **Then** `null` or an appropriate error is returned.

---

### User Story 2 - Event resolvers tested (Priority: P2)

Developers can trust that competition and tournament event resolvers — queries, mutations, and field resolvers — behave correctly, including auth guards on write operations.

**Why this priority**: Events drive the core scheduling and results domain; bugs here surface to all club administrators.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="event\\.resolver|draw\\.resolver|subevent\\.resolver"` and see all tests pass.

**Acceptance Scenarios**:

1. **Given** a valid event ID, **When** `eventCompetition` or `eventTournament` query runs, **Then** the correct entity is returned.
2. **Given** a list query, **When** `eventCompetitions` or `eventTournaments` is called, **Then** a paged result is returned.
3. **Given** an unauthorized user, **When** `updateEventCompetition`, `updateEventTournament`, `removeEventTournament`, `copyEventCompetition`, `syncEvent`, or `recalculate*` mutations are called, **Then** `UnauthorizedException` is thrown.
4. **Given** an authorized user, **When** those mutations are called, **Then** the transaction commits and the updated entity is returned.
5. **Given** a `DrawTournament` parent, **When** `eventEntries` or `games` field resolvers run, **Then** associated entities are returned.
6. **Given** a `SubEventTournament` parent, **When** `drawTournaments` or `eventTournament` field resolvers run, **Then** the correct associations are returned.

---

### User Story 3 - Encounter-change resolver tested (Priority: P2)

Developers can trust that `encounterChange` queries and the `addChangeEncounter` / `updateEncounterChange` mutations are covered, including authorization.

**Why this priority**: Encounter rescheduling is club-facing and time-sensitive; silent regressions are hard to detect manually.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="encounter-change"` and see passing tests.

**Acceptance Scenarios**:

1. **Given** a valid ID, **When** `encounterChange` query runs, **Then** the entity is returned.
2. **Given** list args, **When** `encounterChanges` runs, **Then** paged results are returned.
3. **Given** an unauthorized user, **When** `addChangeEncounter` or `updateEncounterChange` is called, **Then** `UnauthorizedException` is thrown.
4. **Given** an authorized user, **When** mutations succeed, **Then** transaction commits and updated entity is returned.
5. **Given** an `EncounterChange` parent, **When** `dates` field resolver runs, **Then** associated dates are returned.

---

### User Story 4 - Availability, FAQ, Notification, CronJob, Service resolvers tested (Priority: P3)

Developers can trust that all remaining resolvers — availability, FAQ, notifications, cron jobs, and services — have baseline query and mutation coverage.

**Why this priority**: Lower operational criticality, but needed for full coverage and regression safety.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="availability|faq|notification|cronJob|service"` and see tests pass.

**Acceptance Scenarios**:

1. **Given** valid input, **When** any list or single-entity query runs, **Then** correct data is returned.
2. **Given** unauthorized access, **When** any write mutation is called (createFaq, updateFaq, deleteFaq, createAvailability, updateAvailability, updateCronJob, updateNotification), **Then** `UnauthorizedException` is thrown.
3. **Given** authorized access, **When** write mutations are called with valid data, **Then** transaction commits and the result is returned.
4. **Given** a `CronJob` parent, **When** `nextRun` field resolver runs, **Then** a formatted date string is returned.

---

### User Story 5 - Assembly and RankingSystemGroup resolvers tested (Priority: P3)

Developers can trust that the assembly validation query, `createAssembly` mutation, and ranking group mutations are covered.

**Why this priority**: Assembly validation and ranking group changes are admin operations; correctness is required before any competition starts.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="assembly|rankingSystemGroup"` and see tests pass.

**Acceptance Scenarios**:

1. **Given** valid assembly input, **When** `validateAssembly` query runs, **Then** the validation result is returned.
2. **Given** an unauthorized user, **When** `createAssembly`, `addSubEventsToRankingGroup`, or `removeSubEventsToRankingGroup` is called, **Then** `UnauthorizedException` is thrown.
3. **Given** authorized access and valid IDs, **When** ranking group mutations succeed, **Then** transaction commits and the updated group is returned.

---

### User Story 6 - ClubMembership resolver tested (Priority: P3)

Developers can trust that `clubPlayerMemberships` query and its `club` / `player` field resolvers work correctly.

**Why this priority**: Club membership is a read-heavy query path with field-level associations that must be correct.

**Independent Test**: Run `nx test backend-graphql --testPathPattern="club-membership"` and see tests pass.

**Acceptance Scenarios**:

1. **Given** list args, **When** `clubPlayerMemberships` query runs, **Then** a paged result is returned.
2. **Given** a `ClubPlayerMembership` parent, **When** `club` field resolver runs, **Then** the associated club is returned.
3. **Given** a `ClubPlayerMembership` parent, **When** `player` field resolver runs, **Then** the associated player is returned.

---

### User Story 7 - Single coverage command for CI and local use (Priority: P1)

Developers and CI pipelines can run one command to produce a consolidated coverage report across the entire active codebase, excluding the legacy Angular frontend.

**Why this priority**: Without a coverage gate, newly written tests provide no ongoing assurance — coverage can silently regress on future PRs.

**Independent Test**: Run the coverage command locally; a coverage report is generated and exits 0. Confirm legacy `apps/badman/` and `libs/frontend/` paths are absent from the report.

**Acceptance Scenarios**:

1. **Given** the project root, **When** the coverage command is run, **Then** it collects coverage from all non-legacy libs and apps and exits with code 0 when thresholds are met.
2. **Given** a CI environment, **When** the same command is run, **Then** it behaves identically to local execution with no interactive prompts required.
3. **Given** the output, **When** the report is inspected, **Then** no paths under `apps/badman/` or `libs/frontend/` appear.
4. **Given** coverage falls below the defined threshold, **When** the command runs, **Then** it exits non-zero so CI fails.

---

### User Story 8 - Audit report: missing auth, duplication, and quick wins (Priority: P2)

After tests are written, a structured audit of all resolver implementations is produced — flagging gaps in authentication/authorization, duplicated logic across resolvers, and areas with quick wins in performance, deduplication, or code quality.

**Why this priority**: Tests reveal surface-level behavior. The audit surfaces structural issues that tests alone won't catch, giving a prioritized action list before they compound.

**Independent Test**: A written audit document (`specs/032-resolver-test-coverage/audit.md`) exists, covering all 33 resolvers, with findings grouped by category and each finding linked to a specific file and line.

**Acceptance Scenarios**:

1. **Given** a resolver that performs writes but does not call `user.hasAnyPermission()`, **When** the audit runs, **Then** that resolver is flagged under "Missing Authorization".
2. **Given** two or more resolvers with identical or near-identical logic blocks, **When** the audit runs, **Then** they are flagged under "Duplication".
3. **Given** a resolver that issues multiple sequential queries that could be batched or that lacks dataloader usage on an N+1-prone field resolver, **When** the audit runs, **Then** it is flagged under "Performance Quick Wins".
4. **Given** any finding, **When** it appears in the audit, **Then** it includes: resolver file path, description of the issue, and a suggested fix or next step.
5. **Given** the audit is complete, **When** findings are reviewed, **Then** each finding is classified as: `bug`, `missing-auth`, `duplication`, `performance`, or `code-quality`.

---

### Edge Cases

- What happens when a query by ID receives a UUID vs. a slug?
- How are field resolvers handled when the parent has no associated data (null relations)?
- How does a mutation behave when a transaction commit fails — is it rolled back?
- How does `validateAssembly` respond when the assembly is invalid (returns errors vs. throws)?
- What if a first-pass test written from the contract fails because the implementation is wrong — is that a bug or an incorrect expectation?
- What if a resolver has no auth check but handles only read-only public data — is missing auth a finding or intentional?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each of the 15 resolvers currently missing a `.resolver.spec.ts` file MUST receive a co-located spec file.
- **FR-002**: Every spec file MUST follow the resolver test convention in `CLAUDE.md` (TestingModule + model static spies + auth mocks + `afterEach(jest.restoreAllMocks)`).
- **FR-003**: Each spec MUST cover: query returns data, query returns null/empty when nothing found, mutation rejects unauthorized users, mutation succeeds and commits transaction, mutation rolls back on error.
- **FR-004**: ResolveField methods MUST each have at least one test verifying the correct association is returned.
- **FR-005**: Auth-guarded mutations MUST verify both the authorized and unauthorized paths.
- **FR-006**: All tests MUST run successfully via `nx test backend-graphql` without requiring real database or external services.
- **FR-007**: No test MUST import or instantiate real Sequelize models or a real database connection.
- **FR-008**: Tests MUST be written from the resolver's declared interface (GraphQL schema, method names, argument shapes) — not by reading the implementation first. Implementation is consulted only in the second pass to add deeper coverage.
- **FR-009**: Any behavioral discrepancy discovered during testing (test written from expected contract fails against actual implementation) MUST be documented as a finding. A fix MAY be applied in the same PR only if it meets all three: ≤5 lines changed, touches exactly one method, and requires no model or GraphQL schema change. All other bugs MUST be filed as separate work and linked from `audit.md`.
- **FR-010**: After all behavioral tests pass, an audit document (`specs/032-resolver-test-coverage/audit.md`) MUST be produced covering all 33 resolvers, identifying: missing or insufficient authorization checks, duplicated logic, N+1 / performance risks, and code-quality issues. The file is committed to the repo as a permanent artifact. Findings that require follow-up work MUST be noted with a placeholder link to the feature spec that will address them.
- **FR-011**: Each audit finding MUST include: category (`bug` / `missing-auth` / `duplication` / `performance` / `code-quality`), file path, description, and suggested remedy.
- **FR-012**: A single npm script (e.g. `npm run test:coverage`) MUST run all non-legacy tests with coverage collection enabled, print a text summary to the console, and write an lcov report file for future CI upload integrations.
- **FR-013**: The coverage command MUST exclude `apps/badman/` and `libs/frontend/` (legacy Angular) from both test execution and coverage collection.
- **FR-014**: The coverage command MUST enforce a minimum line/branch/function/statement coverage threshold; falling below it MUST cause a non-zero exit code. The threshold is initially set to 0% (placeholder); it MUST be pinned to the measured post-implementation value (rounded down to nearest 5%) in the same PR that introduces the tests.
- **FR-016**: Both the project README and the AI harness context file (CLAUDE.md / AGENTS.md) MUST document how to update the coverage threshold, including where the value lives and the command to re-measure current coverage.
- **FR-015**: The same command MUST be usable in CI without modification (no interactive prompts, no TTY requirements).

### Key Entities

- **Resolver spec file**: Co-located `*.resolver.spec.ts` file exercising one resolver in isolation.
- **Auth mock**: Fake `Player` instance with `hasAnyPermission` jest.fn() returning `true` or `false`.
- **Model mock**: `jest.spyOn(Model, 'staticMethod')` replacing Sequelize model statics.
- **Transaction mock**: Fake `{ commit: jest.fn(), rollback: jest.fn() }` injected via mocked `Sequelize.transaction`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 15 missing `.resolver.spec.ts` files exist and are non-empty after the feature is complete.
- **SC-002**: `nx test backend-graphql` passes with zero failures introduced by the new tests.
- **SC-003**: Each new spec file covers at minimum: one query success path, one not-found/empty path, one unauthorized mutation rejection, one authorized mutation success (with commit), and one rollback on error — 5 cases minimum per resolver.
- **SC-004**: No new tests are marked `.skip` or `xit` at the time of PR merge.
- **SC-005**: Test suite runtime does not increase by more than 60 seconds compared to baseline (tests are purely in-memory mocks).
- **SC-006**: A single documented command runs the full coverage report locally and in CI, producing a console text summary and an lcov file, with no additional flags or environment setup required beyond what CI already provides.
- **SC-007**: The coverage report excludes all legacy paths; zero legacy files appear in the report output.
- **SC-008**: Coverage thresholds are enforced — the command exits non-zero when any threshold is breached. The final pinned threshold value is documented in both README and AGENTS.md with instructions for updating it.
- **SC-009**: `specs/032-resolver-test-coverage/audit.md` is committed to the repo, covers all 33 resolvers, every finding is categorized and linked to a specific file, and deferred findings reference the follow-up feature spec that will address them.
- **SC-010**: Any behavioral bugs discovered during the first-pass testing phase are documented; none are silently ignored.

## Clarifications

### Session 2026-06-08

- Q: What format should the coverage report produce? → A: Text summary to console + lcov file (for future CI upload integrations).
- Q: How should the initial coverage threshold be handled? → A: Wire at 0% placeholder; measure post-implementation and pin the real threshold (rounded down to nearest 5%) in the same PR. Document how to update it in both README and AGENTS.md.
- Q: What happens to audit.md after it is produced? → A: Committed to repo permanently. Findings requiring follow-up are linked from the feature specs that will address them.
- Q: What qualifies as a "trivial fix" during first-pass testing? → A: ≤5 lines changed, touches exactly one method, no model or GraphQL schema change. Anything beyond that is filed separately and linked from audit.md.

## Assumptions

- Resolver correctness is NOT assumed. Tests are written from expected behavior (method name, input/output shape, GraphQL contract) rather than trusting the implementation. If a test reveals a bug, the bug is documented — and fixed if trivial, flagged if complex.
- A second pass digs into implementation details after the first-pass behavioral tests are green: inspecting branching logic, edge-case handling, and internal correctness.
- Field resolvers that delegate entirely to Sequelize associations (no business logic) need only a single happy-path test.
- The `services/service.resolver.ts` (read-only, single query) requires only a query-returns-data test and a query-returns-empty test.
- `syncDraw`, `syncSubEvent`, `syncEvent` mutations dispatch to external workers; testing that they dispatch (call the queue service) is sufficient — end-to-end sync behavior is out of scope.
- `recalculate*` mutations similarly only need to verify that the queue/service is called and the transaction is handled; full ranking recalculation is out of scope.
- Coverage thresholds will be set based on current baseline after the new tests are added — not pre-set to an arbitrary number. The initial threshold will be the measured post-implementation coverage rounded down to the nearest 5%.
- Integration tests (`*.integration.spec.ts`) are excluded from the coverage command by default (they require a live database).
