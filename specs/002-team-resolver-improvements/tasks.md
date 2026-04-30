---
description: "Task list for: Reliable Team Creation Errors"
---

# Tasks: Reliable Team Creation Errors

**Input**: Design documents from `/specs/002-team-resolver-improvements/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/createTeam.graphql.md](./contracts/createTeam.graphql.md)

**Tests**: Required by Constitution IV (Resolver Test Discipline). Resolver unit tests follow the reference pattern in `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified in isolation. Note: all stories touch the same `team.resolver.ts` file, so within each story the tasks are sequential at the file level — `[P]` markers appear only on tasks that touch a different file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are absolute or repo-relative.

## Path Conventions

- Resolver: `libs/backend/graphql/src/resolvers/team/team.resolver.ts`
- New `@ObjectType`: `libs/backend/graphql/src/resolvers/team/team-result.object.ts`
- Resolver spec: `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`
- Reference pattern: `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the editing surface and that the test harness runs green before we change anything.

- [ ] T001 Verify the resolver path and current shape: open `libs/backend/graphql/src/resolvers/team/team.resolver.ts` and confirm `TeamsResolver.createTeam(@Args data: TeamNewInput, @Args nationalCountsAsMixed: boolean, @User user: Player): Promise<Team>` and `createTeams(@Args data: [TeamNewInput], ...): Promise<Team[]>` are present and registered in the corresponding NestJS module.
- [ ] T002 Run the existing `backend-graphql` test suite once to capture a green baseline before any edits: `npx jest --config libs/backend/graphql/jest.config.ts`. If anything fails, stop and reconcile before proceeding.
- [ ] T003 Confirm the legacy `teams_unique_constraint` is absent (sanity check for [research.md §R2](./research.md)): `grep -n "teams_unique_constraint" database/migrations/*.js` should show only the create-and-drop history; no live constraint exists. If a live unique index on `(link, season)` is found, stop and revisit Q3 of the spec clarifications.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Author the new `@ObjectType` that all three user stories depend on as the mutation's new return type. No user story phase can complete without this.

**⚠️ CRITICAL**: All user-story phases below depend on T004.

- [ ] T004 [P] Create the `TeamResult` `@ObjectType` at `libs/backend/graphql/src/resolvers/team/team-result.object.ts` with non-null fields `teamId: ID`, `clubId: ID`, `alreadyExisted: Boolean`. Author it as a code-first NestJS `@ObjectType` class per Constitution I (no SDL, no DTO duplication). See [data-model.md §New GraphQL output type](./data-model.md).

**Checkpoint**: `TeamResult` exists and is importable. User-story phases can now begin.

---

## Phase 3: User Story 1 — Classified errors on a failed team create (Priority: P1) 🎯 MVP

**Goal**: Each documented failure mode (`CLUB_NOT_FOUND`, `PERMISSION_DENIED`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`, fallback `INTERNAL_ERROR`) surfaces as a `GraphQLError` with a stable `extensions.code` and the documented per-code payload (see [contracts/createTeam.graphql.md](./contracts/createTeam.graphql.md)).

**Independent Test**: Trigger each failure and confirm the response carries a distinct `extensions.code` and the right `extensions` fields; no message leak from internal exceptions.

- [ ] T005 [US1] In `libs/backend/graphql/src/resolvers/team/team.resolver.ts`, in `createTeam`, after the existing `Club.findByPk(newTeamData.clubId, { transaction })`, replace the `NotFoundException` throw with `throw new GraphQLError(\`Club not found: ${newTeamData.clubId}\`, { extensions: { code: "CLUB_NOT_FOUND", clubId: newTeamData.clubId } })`. Order is preserved: club fetch happens before permission check so `dbClub.id` is available.
- [ ] T006 [US1] In the same file, replace the existing `UnauthorizedException` after the `hasAnyPermission` check with `throw new GraphQLError("You do not have permission to create a team for this club.", { extensions: { code: "PERMISSION_DENIED", userId: user?.id ?? null, clubId: dbClub.id } })`. Permission set unchanged: `[\`${dbClub.id}_edit:club\`, "edit-any:club"]` (no expansion needed; existing perms cover the case — see [research.md §R4](./research.md)).
- [ ] T007 [US1] In the same file, in the roster-sync block (currently around lines 265–321), replace the `NotFoundException(\`${Player.name}: ${player.id}\`)` with `throw new GraphQLError(\`Player not found: ${player.id}\`, { extensions: { code: "PLAYER_NOT_FOUND", playerId: player.id } })`. Apply to both miss-paths (the `Promise.all` map and any future iteration).
- [ ] T008 [US1] In the same file, in the entry-sync block (currently around lines 381–392), replace the two `NotFoundException`s with `throw new GraphQLError(\`Player not found: ${p.id}\`, { extensions: { code: "PLAYER_NOT_FOUND", playerId: p.id } })` for the missing-player case and `throw new GraphQLError(\`Ranking for player ${p.id} not found\`, { extensions: { code: "RANKING_NOT_FOUND", playerId: p.id } })` for the missing-ranking case.
- [ ] T009 [US1] In the same file, also replace the `NotFoundException("No primary ranking system found")` (around line 354) with `throw new GraphQLError("Primary ranking system not configured.", { extensions: { code: "INTERNAL_ERROR" } })` — primary system absence is an environment/config defect, not a user-classifiable error.
- [ ] T010 [US1] In the same file, change the catch block: (a) keep `await transaction.rollback()`, (b) re-throw any caught `GraphQLError` unchanged so classified codes survive, (c) for any other thrown value, log the original error with full stack at `error` severity using the existing `this.logger` (upgrade from current `warn("rollback", e)`) then throw a sanitized `new GraphQLError("Internal error.", { extensions: { code: "INTERNAL_ERROR" } })` so internal details (SQL, stack frames) do not leak. Remove the now-dead `BadRequestException("Could not create team")` defensive throw inside the player-sync block (`teamDb` is guaranteed non-null at that point — see [research.md §R5](./research.md)).
- [ ] T011 [US1] Add a structured `warn`-level log at each classified-rejection throw site in the same file: `this.logger.warn({ code, clubId, playerId?, userId: user?.id ?? null })` (include `playerId` only for `PLAYER_NOT_FOUND` / `RANKING_NOT_FOUND`). UUID only — never email or other PII (Constitution / FR-011).
- [ ] T012 [US1] In `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts` (create if missing; mirror `enrollmentSetting.resolver.spec.ts`), add cases: anonymous user → `PERMISSION_DENIED` with rollback; authenticated user with no matching permission → `PERMISSION_DENIED` with `clubId` in `extensions`; club not found → `CLUB_NOT_FOUND` with rollback; `players[i].id` missing → `PLAYER_NOT_FOUND` with `playerId` in `extensions` and rollback; base-lineup ranking missing → `RANKING_NOT_FOUND` with `playerId` and rollback; unexpected throw → `INTERNAL_ERROR` with rollback and `error`-level log; assert no SQL/stack-frame text appears in the thrown `GraphQLError.message`. Use `Test.createTestingModule`, fake `Sequelize.transaction()` returning `{ commit, rollback }` jest.fn stubs, mock model statics with `jest.spyOn`, fake `Player` with `hasAnyPermission` jest.fn, `afterEach(jest.restoreAllMocks)`.

**Checkpoint**: All five error codes round-trip through the resolver with the right `extensions` payload, transaction rollback is verified, and unit tests are green.

---

## Phase 4: User Story 2 — Idempotent re-submit for a team that already exists (Priority: P1)

**Goal**: When a team already exists for `(link, season)`, the mutation returns success with `alreadyExisted: true` and performs NO writes. The previous upsert-on-find behavior (mutating top-level fields, roster, and entry on find) is fully removed; updates flow through `updateTeam`.

**Independent Test**: Submit `createTeam` once with a `link`, then again with the same `link` + `season`. The second call returns `alreadyExisted: true`; no `Team.create`, `setClub`, `addPlayer`, `removePlayer`, `addEventEntry`, or `EventEntry.findOrCreate` calls happen on the second path. Verified at the resolver-unit level via mocks.

- [ ] T013 [US2] In `libs/backend/graphql/src/resolvers/team/team.resolver.ts`, after the club fetch (T005) and permission check (T006), and BEFORE computing `teamNumber`, add the idempotency lookup: when `newTeamData.link` is provided, call `Team.findOne({ where: { link: newTeamData.link, season: newTeamData.season }, transaction })`. If a row is returned, commit the (read-only) transaction and return `TeamResult { teamId: existing.id, clubId: existing.clubId!, alreadyExisted: true }`. No further writes happen on this path.
- [ ] T014 [US2] In the same file, REMOVE the existing upsert-on-find behavior: delete the entire `if (!created) { ... }` block that mutates the existing team's top-level fields (lines 245–260 of the pre-change file), AND remove the `if (newTeamData.players)` and `if (newTeamData.entry)` blocks from the find path so they only run on the freshly-created branch. After this change, the only post-find code path is the early-return added in T013; everything below assumes `teamDb` was just freshly `Team.create`-d. Update the comment block above the find logic to state "Idempotency: see [research.md §R2](./research.md). Updates flow through updateTeam ([Linear BAD-128](https://linear.app/dashdot/issue/BAD-128))."
- [ ] T015 [US2] In `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`, add cases: (a) `Team.findOne({ where: { link, season } })` returns an existing row → resolver returns `{ teamId: existing.id, clubId: existing.clubId, alreadyExisted: true }`, calls `transaction.commit` exactly once, and NEVER calls `Team.create`, `setClub`, `addPlayer`, `removePlayer`, `addPlayers`, `removePlayers`, `EventEntry.findOrCreate`, or `dbEntry.save`; (b) `link` provided but `Team.findOne` returns null → fresh-create path runs; (c) `link` not provided → fresh-create path runs (no `Team.findOne` call expected).

**Checkpoint**: Idempotent path verified; the upsert-on-find behavior is gone.

---

## Phase 5: User Story 3 — Structured success result the client can act on (Priority: P2)

**Goal**: The mutation returns `TeamResult` (not the full `Team` model), echoing `teamId`, `clubId`, and `alreadyExisted`. The `createTeams` batch mutation's return changes from `[Team]` to `[TeamResult]` accordingly.

**Independent Test**: A successful fresh-create returns `{ teamId, clubId, alreadyExisted: false }`; the idempotent path (US2) returns `{ ..., alreadyExisted: true }`. The `createTeams` batch returns one `TeamResult` per input.

- [ ] T016 [US3] In `libs/backend/graphql/src/resolvers/team/team.resolver.ts`, change the `@Mutation(() => Team)` decorator on `createTeam` to `@Mutation(() => TeamResult)`, import `TeamResult` from `./team-result.object.ts`, change the function's `Promise<Team>` return type to `Promise<TeamResult>`, and replace the `return teamDb;` line on the fresh-create path with `return { teamId: teamDb.id, clubId: teamDb.clubId!, alreadyExisted: false };`. The idempotent return shape was already authored in T013.
- [ ] T017 [US3] In the same file, change the `@Mutation(() => [Team])` decorator on `createTeams` to `@Mutation(() => [TeamResult])`, change the function signature's `Promise<Team[]>` to `Promise<TeamResult[]>`, and the `results: Team[]` local to `results: TeamResult[]`. The body already pushes the result of `await this.createTeam(...)` so it picks up the new shape automatically.
- [ ] T018 [US3] In `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`, add a fresh-create success case asserting the returned object equals `{ teamId: <created>.id, clubId: <created>.clubId, alreadyExisted: false }` and that `transaction.commit` was called exactly once. Add a `createTeams` regression case asserting the array shape: input length N → output array length N, each element a `TeamResult`.

**Checkpoint**: GraphQL contract change shipped; `Team` return type fully replaced by `TeamResult` for both mutations.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the change holistically, ensure tests + lint pass, and confirm the change does not touch out-of-scope surfaces (legacy frontend, i18n, migrations).

- [ ] T019 Run the full lib test suite and confirm green: `nx test backend-graphql` (or `npx jest --config libs/backend/graphql/jest.config.ts`).
- [ ] T020 Run lint on the affected lib: `nx lint backend-graphql`. Fix any lint issues introduced by the changes.
- [ ] T021 Run `prettier --check libs/backend/graphql/src/resolvers/team/`. Run `prettier --write` on those files if needed and re-check.
- [ ] T022 Verify scope discipline: confirm no edits to `apps/badman/`, `libs/frontend/`, `libs/backend/translate/assets/i18n/**`, `libs/utils/src/lib/i18n.generated.ts`, or `database/migrations/**` (Constitution II + V; no migration per [research.md §R10](./research.md)). Run `git diff --stat` and inspect.
- [ ] T023 Manually smoke-test the mutation against a local API + DB per [quickstart.md §Manual smoke test](./quickstart.md): trigger fresh create, idempotent re-submit (`alreadyExisted: true` with no DB write), and each of the five error classes, observing the response `extensions.code` values. **Status: deferred — needs a human at the running API + GraphQL Playground; cannot be automated from the implementation pass. Run before merging the PR.**
- [ ] T024 [P] Append a new entry to `docs/tech-debt.md` (existing registry; do NOT create a new file) under the `## Backend` section, mirroring the BAD-21 wording. Cover at minimum: (a) no DB-level uniqueness on `Teams(link, season)` — idempotency is application-level via the find-then-create flow, leaving a narrow concurrent-write window (FR-006); recommended fix: add a partial unique index `CREATE UNIQUE INDEX ... ON "Teams" (link, season) WHERE link IS NOT NULL`; (b) the `teamNumber` auto-increment race when the caller omits `teamNumber` (`MAX(teamNumber)+1` for `(clubId, type, season)`) is preserved as pre-existing behavior, intentionally out of scope per spec clarification Q4 — flag whether product wants `TEAM_NUMBER_CONFLICT` as a future error code; (c) the upsert-on-find removal forces FE callers (notably season rollover) to migrate to a `createTeam` → on-`alreadyExisted` `updateTeam` pattern — track in [Linear BAD-128](https://linear.app/dashdot/issue/BAD-128) until closed. For each entry: state Where, What, Why we shipped it, Fix effort + Trigger to revisit, Status. Add rows to the existing debt table at the top of the file in the same order, and bump the version comment.

---

## Dependencies

- T001, T002, T003 (Setup) before everything.
- T004 (Foundational `TeamResult`) blocks Phase 5 (T016, T017, T018) and is also referenced by T013 in Phase 4 — so T004 effectively blocks all user-story phases.
- Within Phase 3 (US1): T005 → T006 (T006 reads `dbClub.id` set up by T005); T007–T009 are independent edits to different blocks of the same file (sequential at file level); T010 wraps the catch and depends on T005–T009 being in place; T011 (logging) depends on the throw sites authored in T005–T009; T012 (tests) depends on T005–T011.
- Phase 4 (US2): depends on Phase 3 completion (US2's tests assert `commit` semantics added in US1's catch path; the idempotency early-return must throw `GraphQLError` for any classification that occurs before the lookup).
- Phase 5 (US3): depends on Phase 4 (idempotent return shape is authored there) and on T004.
- Phase 6: runs last.

## Parallel Execution

Most tasks edit the same single resolver file (`team.resolver.ts`) and its single spec file, so very few opportunities for parallel work exist.

True parallel pairs:

- T004 (new file `team-result.object.ts`) is parallelizable with T001/T002/T003 (read-only / unrelated paths) — marked `[P]`.
- T024 (tech-debt entry, separate file `docs/tech-debt.md`) is parallelizable with T019–T023 — marked `[P]`.

## Implementation Strategy

1. **MVP (US1)**: Phase 1 → Phase 2 → Phase 3. After Phase 3 the failure modes are correctly classified and observable in logs — operations alone can identify the original error from server logs without needing the user, even before idempotency or the structured return ships.
2. **Full v1**: Continue with Phase 4 (idempotency + upsert removal) → Phase 5 (structured return) → Phase 6 (polish + tech-debt entry). The active frontend repo will be migrated separately ([BAD-128](https://linear.app/dashdot/issue/BAD-128)); the legacy frontend in this repo is reference-only and stays untouched (Constitution V).
3. **Increment ordering rationale**: US1 first because it is the smallest change that classifies all failures and unblocks log-based triage. US2 second because removing the upsert-on-find behavior is the largest behavior change in the PR and benefits from being on top of US1's classified-error scaffolding. US3 last because it is the breaking GraphQL contract change that requires the FE to migrate in lockstep — landing it after US1+US2 means the resolver's internal correctness (errors, idempotency) is already proven by unit tests before the contract changes shape.
