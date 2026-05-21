---
description: "Tasks for EventEntry Team & Standing DataLoader Batching"
---

# Tasks: EventEntry Team & Standing DataLoader Batching

**Input**: Design documents from `/specs/029-evententry-team-standing-loaders/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Required (spec FR-007 mandates regression-protecting batching tests).
**Organization**: Single user story (US1). Setup and Foundational phases are thin because this is an in-place refactor in an existing Nx lib.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 only here)

## Path Conventions

Backend GraphQL lib: `libs/backend/graphql/src/...` (Nx monorepo).

---

## Phase 1: Setup

- [ ] T001 Confirm working branch is `029-evententry-team-standing-loaders` and worktree clean (`git status`). Pull latest `develop` and rebase if behind.

---

## Phase 2: Foundational (blocks all stories)

- [ ] T002 Create `StandingLoaderService` request-scoped DataLoader at [libs/backend/graphql/src/loaders/standing-loader.service.ts](libs/backend/graphql/src/loaders/standing-loader.service.ts). Mirror [team-loader.service.ts](libs/backend/graphql/src/loaders/team-loader.service.ts): `@Injectable({ scope: Scope.REQUEST })`, private `DataLoader<string, Standing | null>`, `load(entryId)` short-circuits on falsy, batch fn issues `Standing.findAll({ where: { entryId: { [Op.in]: [...ids] } } })` and maps by `entryId`. Add JSDoc explaining the use case (collapses per-entry standing lookups in `EventEntryResolver`).

- [ ] T003 Export `StandingLoaderService` from [libs/backend/graphql/src/loaders/index.ts](libs/backend/graphql/src/loaders/index.ts) by adding `export * from "./standing-loader.service";`.

---

## Phase 3: User Story 1 — Batch team and standing lookups on EventEntry (P1)

**Story goal**: A single GraphQL request that selects `team` and/or `standing` on N `EventEntry`s triggers exactly one `Team.findAll(IN ...)` and one `Standing.findAll(IN ...)`, regardless of N.

**Independent test**: Resolve `query GetClubTeams` against a club with ≥3 teams whose entries have standings. Observe Sequelize logs show one batched `Team` and one batched `Standing` query.

### Tests (write first, must fail until implementation lands)

- [ ] T004 [US1] Add `describe("team batching")` block to [libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts](libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts). Wire `TeamLoaderService` into the test module providers. Construct ≥3 fake `EventEntry` parents with distinct `teamId`s. Spy on `Team.findAll`. Resolve the `team` field on all parents concurrently with `Promise.all`. Assert `Team.findAll` called exactly once with all ids in `Op.in`, results map back per parent, and a parent with falsy `teamId` resolves to `null`.

- [ ] T005 [P] [US1] Add `describe("standing batching")` block to [libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts](libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts). Wire `StandingLoaderService` into the test module providers. Construct ≥3 fake `EventEntry` parents with distinct `id`s. Spy on `Standing.findAll`. Resolve the `standing` field on all parents concurrently with `Promise.all`. Assert `Standing.findAll` called exactly once with all entry ids in `Op.in`; an entry with no matching standing row resolves to `null`.

- [ ] T006 [P] [US1] Add `describe("enrollmentValidation reuses team loader")` block to [libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts](libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts). Resolve `team` and `enrollmentValidation` on the same parents in the same tick. Assert `Team.findAll` still called only once.

- [ ] T007 [P] [US1] Add a standalone unit spec [libs/backend/graphql/src/loaders/standing-loader.service.spec.ts](libs/backend/graphql/src/loaders/standing-loader.service.spec.ts) for the loader itself. Cover: batches N ids into one `findAll` call; ids without matching rows resolve to `null`; falsy `load(undefined)` short-circuits without a DB call; batch failure rejects every concurrent caller.

### Implementation (US1)

- [ ] T008 [US1] Register loaders in [libs/backend/graphql/src/resolvers/event/event.module.ts](libs/backend/graphql/src/resolvers/event/event.module.ts) by importing `TeamLoaderService` and `StandingLoaderService` from `"../../loaders"` and adding both to the `providers:` array next to `SubEventCompetitionLoaderService`.

- [ ] T009 [US1] Update [libs/backend/graphql/src/resolvers/event/entry.resolver.ts](libs/backend/graphql/src/resolvers/event/entry.resolver.ts):
  - Add `TeamLoaderService` and `StandingLoaderService` imports from `"../../loaders"`.
  - Inject them in `EventEntryResolver`'s constructor (alongside `subEventLoader`) as `private readonly teamLoader: TeamLoaderService` and `private readonly standingLoader: StandingLoaderService`.
  - Replace `team()` body at lines 53–56: `return this.teamLoader.load(eventEntry.teamId) as Promise<Team>;`
  - Replace `standing()` body at lines 81–84: `return this.standingLoader.load(eventEntry.id);`
  - Replace the `eventEntry.getTeam()` call inside `enrollmentValidation()` (line 93) with `await this.teamLoader.load(eventEntry.teamId)`. Keep the existing null-guard / cache lookup.

### Verification (US1)

- [ ] T010 [US1] Run `nx test backend-graphql --testPathPattern="entry.resolver.dataloader.spec|standing-loader.service.spec"`. All new and existing specs pass.

- [ ] T011 [US1] Manual quickstart per [specs/029-evententry-team-standing-loaders/quickstart.md](specs/029-evententry-team-standing-loaders/quickstart.md): start API + Postgres, run a `GetClubTeams` operation against a seeded club with ≥3 teams, capture Sequelize logs. Confirm one batched `Teams WHERE id IN (...)` and one batched `Standings WHERE entryId IN (...)`. Diff response JSON against a baseline taken from `develop` for SC-003.

---

## Phase 4: Polish & Cross-Cutting

- [ ] T012 Run `nx affected:test` and `nx lint backend-graphql`. Fix any formatting via `prettier --write libs/backend/graphql/src/loaders libs/backend/graphql/src/resolvers/event`.

- [ ] T013 Open PR `029-evententry-team-standing-loaders` → `develop`. Title: `perf(graphql): batch EventEntry team and standing lookups`. Body references Sentry issue 121423071 and links the spec, plan, and quickstart.

---

## Dependencies

```text
T001 (Setup)
  └─ T002, T003 (Foundational — new loader + export)
       └─ T004, T005, T006, T007 (US1 tests — independent files where marked [P])
            └─ T008 (US1 module wiring)
                 └─ T009 (US1 resolver edits)
                      └─ T010 (US1 jest)
                           └─ T011 (US1 manual quickstart)
                                └─ T012 (lint/format)
                                     └─ T013 (PR)
```

Notes:
- T002 must land before T007's spec file imports `StandingLoaderService`.
- T004 lives in the same spec file as T005/T006, so they conflict on the same file — T004 is sequential; T005 and T006 are marked [P] for parallelism between themselves and T007 only, **but** because all three touch the same `entry.resolver.dataloader.spec.ts` they must actually be applied sequentially in the editor. The [P] markers indicate they can be authored independently in parallel branches/agents and merged in any order; do not run them concurrently against the same working tree.
- T007 is fully parallel — different file.

## Parallel Execution Examples

- After T003 lands, write T005, T006, T007 in parallel (T005/T006 update one shared spec, T007 creates a new spec). Merge T004 first, then T005, then T006.
- T012 polish (lint/format) can run continuously in the background after every edit.

## Implementation Strategy (MVP)

There is only one user story. MVP = full feature. Suggested merge order:

1. Land T002 + T003 (foundation only) in one commit — safe, no behavior change.
2. Land T008 + T009 (resolver + module wiring) plus tests T004–T007 in a second commit.
3. T010–T013 close out the PR.

## Format Validation

All tasks use the required `- [ ] TID [P?] [Story?] Description with path` format. Setup, Foundational, and Polish tasks intentionally have no `[US?]` label per the rules.
