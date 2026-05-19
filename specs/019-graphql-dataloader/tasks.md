---
description: "Task list for feature 019 — Adopt DataLoader for GraphQL N+1 batching"
---

# Tasks: Adopt DataLoader for GraphQL N+1 batching

**Input**: Design documents from `/specs/019-graphql-dataloader/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/team-association.service.contract.md](contracts/team-association.service.contract.md), [quickstart.md](quickstart.md)

**Tests**: Existing spec [`team-association.service.spec.ts`](libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) already covers the contract. No new test tasks are introduced — assertions in the existing spec MUST remain green per FR-009.

**Organization**: One user story (US1). Phase 1 sets up the dep, Phase 2 has no foundational blockers, Phase 3 (US1) does the refactor, Phase 4 is polish + verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1)
- File paths are absolute-from-repo-root for unambiguous execution

## Path Conventions

Nx monorepo. Backend libs under `libs/backend/`. Single-file refactor scope per [plan.md](plan.md) Project Structure section.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the `dataloader` runtime dependency to the workspace.

- [X] T001 Install `dataloader@^2.2.3` runtime dependency: run `npm install dataloader@^2.2.3` from repo root and confirm the entry appears under `dependencies` (not `devDependencies`) in `package.json`.
- [X] T002 Verify the `nx/dependency-checks` lint rule accepts the new specifier: run `npx nx lint backend-graphql` and confirm the error count stays at the baseline of 1 (pre-existing, unrelated). Adjust the `dataloader` version specifier in `package.json` to exact-match the installed version if the rule requires it (research.md R-006).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required for this feature. The change is a single-file internal refactor with no shared infrastructure to set up before US1.

**Checkpoint**: Skip directly to Phase 3.

---

## Phase 3: User Story 1 — Replace custom batcher with DataLoader (Priority: P1) 🎯 MVP

**Goal**: Internals of `TeamAssociationService` use `DataLoader` instances; public API + observable behaviour unchanged.

**Independent Test**: Run `nx test backend-graphql --testPathPattern team-association` — 7 cases pass. Then run quickstart.md step 4 manually against a club with ≥10 teams; SQL query count constant across team count.

### Implementation for User Story 1

- [X] T003 [US1] Rewrite [libs/backend/graphql/src/resolvers/team/team-association.service.ts](libs/backend/graphql/src/resolvers/team/team-association.service.ts) internals: delete the `Batch<K, V>`, `BatchState<K, V>` types and the `loadOne()` helper. Add `import DataLoader from "dataloader";` Replace the five `BatchState` fields with five `DataLoader` instances initialised as readonly fields (`captainLoader`, `locationLoader`, `clubLoader`, `entryLoader`, `playersLoader`) per the type table in [data-model.md](data-model.md). Keep public method signatures (`getCaptain` / `getPrefferedLocation` / `getClub` / `getEntry` / `getPlayers`) byte-for-byte identical (FR-002). Each public method short-circuits to `Promise.resolve(null)` when the FK is missing (preserves current edge case), otherwise calls the corresponding `loader.load(...)`.
- [X] T004 [US1] Move the existing five batch helpers (`loadPlayersByIds`, `loadLocationsByIds`, `loadClubsByIds`, `loadEntriesByTeamIds`, `loadPlayersByTeamIds`) into the batch functions passed to the new `DataLoader` constructors in the same file. Adapt each to return `ReadonlyArray<V | null>` in input-key order — see research.md R-001 for the contract and R-003 for the per-loader SQL shape. Critically preserve: (a) the `drawId ?? first` selection rule for `entryLoader` (FR-004), and (b) the `player.TeamPlayerMembership` attachment for `playersLoader` (FR-005).
- [X] T005 [US1] Run the existing spec [libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts](libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) via `npx jest --config libs/backend/graphql/jest.config.ts --testPathPattern team-association`. All 7 cases MUST pass without weakening any assertion (FR-009). If a spy shape needs to change because DataLoader caches differently (R-004), document the change as a comment in the spec file.

**Checkpoint**: User Story 1 complete — `team-association.service.ts` is rewritten, existing spec is green, no other file changed.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide verification that the change is contained and matches the post-#920 baseline.

- [X] T006 Run full backend-graphql lib test sweep: `npx jest --config libs/backend/graphql/jest.config.ts`. Pass/fail count MUST equal the baseline on `fix/club-players-teams-n1` (250 pass, 8 pre-existing `enrollment.resolver.spec` failures, 1 skip) per SC-003.
- [X] T007 Run full backend-graphql lint: `npx nx lint backend-graphql`. Problem count MUST stay at 37 (1 error pre-existing, 36 warnings). Any new entry blocks merge per SC-003.
- [X] T008 Run full backend-ranking sweep: `npx jest --config libs/backend/ranking/jest.config.ts`. 15 pass expected (unaffected by this PR; sanity check that the dep change didn't break transitive imports).
- [X] T009 Confirm single-file diff scope: `git diff --name-only origin/main..HEAD` MUST list only `libs/backend/graphql/src/resolvers/team/team-association.service.ts`, optionally the spec file, and `package.json` / `package-lock.json` (SC-005). Anything else is a contract violation and must be reverted.
- [X] T010 Execute the manual SQL trace from [quickstart.md](quickstart.md) step 4 against a seeded local DB. Record the per-table query count in the PR description as evidence for SC-001.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** — no upstream dependencies; T002 depends on T001 sequentially.
- **Phase 2 (Foundational)** — empty.
- **Phase 3 (US1)** — depends on Phase 1; T003 → T004 → T005 sequential (same file).
- **Phase 4 (Polish)** — depends on Phase 3; T006–T009 can run in parallel, T010 is the last gate.

### Within Phase 3

T003, T004, T005 all touch the same file (`team-association.service.ts`) or its spec — execute sequentially. No `[P]` markers possible inside this phase.

### Parallel Opportunities

- T006 + T007 + T008 in Phase 4 can run in parallel (different commands, no shared state).

---

## Parallel Example: Phase 4

```bash
# In separate terminals or background tasks:
npx jest --config libs/backend/graphql/jest.config.ts                        # T006
npx nx lint backend-graphql                                                  # T007
npx jest --config libs/backend/ranking/jest.config.ts                        # T008
```

---

## Implementation Strategy

### MVP First (User Story 1 only — this is the entire feature)

1. Complete Phase 1 (T001 → T002).
2. Skip Phase 2 (empty).
3. Complete Phase 3 (T003 → T004 → T005).
4. **STOP and VALIDATE**: 7 spec cases pass; service file diff is contained; resolver file untouched.
5. Run Phase 4 polish gates (T006–T010).
6. Open PR against `main` once all 10 tasks are checked.

Future opt-in candidates listed in [spec.md](spec.md) "Future Opt-In Candidates" — each becomes a separate feature spec when motivated by a Sentry signal or hot-path manual test, NOT bundled into this PR.

---

## Notes

- This is a behaviour-preserving refactor. Every task is a guard against accidental scope creep.
- T009 (single-file diff) is the contract gate. If `git diff --name-only` shows anything outside the service file, its spec, and `package.json`/`package-lock.json`, stop and re-scope.
- The `dataloader` lib has no transitive deps — security review surface for the new dep is minimal.
- Commit cadence: one commit after Phase 1 (dep install + lockfile), one commit after Phase 3 (refactor), final commit if Phase 4 surfaces any spec-side mock tweak.
