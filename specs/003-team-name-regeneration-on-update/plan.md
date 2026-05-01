# Implementation Plan: Team Name/Abbreviation On-Update Regeneration

**Branch**: `003-linear-bad-127` | **Date**: 2026-04-30 | **Spec**: [spec.md](spec.md)

## Summary

The `Team` Sequelize model regenerates `name` and `abbreviation` only on create. Adding `@BeforeUpdate` and `@BeforeBulkUpdate` hooks (guarded by `instance.changed()`) makes updates self-healing. The `updateTeam` resolver's manual — and partially incorrect — name construction is removed; the cascade renumber flow is updated to use `{ hooks: false }` for intermediate saves only.

## Technical Context

**Language/Version**: TypeScript (Node.js 20, Nx monorepo)
**Primary Dependencies**: NestJS, Sequelize + sequelize-typescript, Apollo GraphQL
**Storage**: PostgreSQL (multi-schema; Team is in `public` schema)
**Testing**: Jest via Nx (`nx test backend-database`, `nx test backend-graphql`)
**Target Platform**: Node.js API server (port 5010)
**Project Type**: NestJS Nx monorepo — library patches only (`@badman/backend-database`, `@badman/backend-graphql`)
**Performance Goals**: Hook overhead is a single DB read (club lookup) already done in current create hooks; no regression.
**Constraints**: Unique constraint on `(name, clubId, teamNumber)` requires temp-name cascade during renumber. No migrations needed.
**Scale/Scope**: Single model file + one resolver mutation + tests.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | Team model already exists; no new entities. Hook additions are additive. |
| II. Translation Discipline | PASS | No i18n changes. |
| III. Transactional Mutations | PASS | `updateTeam` already uses a transaction with commit/rollback. Preserved. |
| IV. Resolver Test Discipline | REQUIRES WORK | `updateTeam` has zero tests. Fix must add full coverage per the reference pattern. |
| V. Legacy Frontend Boundary | PASS | No frontend changes. |

## Project Structure

### Documentation (this feature)

```text
specs/003-team-name-regeneration-on-update/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← Phase 1 entities + hook lifecycle
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (affected files)

```text
libs/backend/database/src/models/
└── team.model.ts                              ← add @BeforeUpdate + @BeforeBulkUpdate; fix @BeforeBulkCreate double-call

libs/backend/graphql/src/resolvers/team/
├── team.resolver.ts                           ← remove manual name construction; update cascade to use hooks:false
└── team.resolver.spec.ts                      ← add updateTeam test cases

libs/backend/database/src/models/
└── team.model.spec.ts                         ← new: unit tests for @BeforeUpdate hook

libs/backend/graphql/src/utils/
└── error-codes.ts                             ← add TEAM_NUMBER_CONFLICT
```

## Phase 0: Research (complete)

See [research.md](research.md). All unknowns resolved. Key decisions:

1. Hook added to model; cascade keeps temp-name approach with `{ hooks: false }` on intermediate saves.
2. Resolver manual name construction removed — hook handles it correctly.
3. `_setNameAndAbbreviation` retained, narrowed to temp-mode only.
4. `TEAM_NUMBER_CONFLICT` error code added for FR-007.
5. `@BeforeBulkCreate` double-call bug fixed in same PR.

## Phase 1: Design & Contracts

See [data-model.md](data-model.md). No schema changes. No migrations.

### updateTeam mutation contract (existing — no signature change)

```graphql
type Mutation {
  updateTeam(data: TeamUpdateInput!): Team!
}
```

**New error code** thrown when teamNumber conflicts:

```json
{
  "errors": [{
    "extensions": {
      "code": "TEAM_NUMBER_CONFLICT",
      "conflictingTeamId": "<uuid>"
    }
  }]
}
```

### Implementation steps (ordered)

#### Step 1 — Add error code

**File**: `libs/backend/graphql/src/utils/error-codes.ts`

Add `TEAM_NUMBER_CONFLICT = 'TEAM_NUMBER_CONFLICT'` to the `ErrorCode` enum.

---

#### Step 2 — Add `@BeforeUpdate` and `@BeforeBulkUpdate` hooks to Team model

**File**: `libs/backend/database/src/models/team.model.ts`

Add imports: `BeforeUpdate`, `BeforeBulkUpdate`, `InstanceUpdateOptions`, `UpdateOptions` from `sequelize-typescript` / `sequelize`.

```typescript
@BeforeUpdate
static async regenerateOnUpdate(instance: Team, options: InstanceUpdateOptions) {
  if (instance.changed('teamNumber') || instance.changed('type')) {
    await this.generateName(instance, options as CreateOptions);
    await this.generateAbbreviation(instance, options as CreateOptions);
  }
}

@BeforeBulkUpdate
static async regenerateOnBulkUpdate(options: UpdateOptions & { instance?: Team }) {
  // Bulk updates via instance hooks require individualHooks: true on the call site.
  // This hook fires per-instance when individualHooks is true.
  if (options.instance) {
    await this.regenerateOnUpdate(options.instance, options as InstanceUpdateOptions);
  }
}
```

Fix the `@BeforeBulkCreate` double-call:

```typescript
@BeforeBulkCreate
static async setAbbriviations(instances: Team[], options: CreateOptions) {
  for (const instance of instances ?? []) {
    await this.setAbbriviation(instance, options); // calls generateName + generateAbbreviation
    // removed: await this.generateAbbreviation(instance, options); ← double-call
  }
}
```

---

#### Step 3 — Update `updateTeam` resolver

**File**: `libs/backend/graphql/src/resolvers/team/team.resolver.ts`

**3a. Add duplicate-number guard** (implements FR-007) — after fetching `dbTeam`, before cascade:

```typescript
if (updateTeamData.teamNumber && updateTeamData.teamNumber !== dbTeam.teamNumber) {
  const conflict = await Team.findOne({
    where: {
      clubId: dbTeam.clubId,
      season: dbTeam.season,
      type: dbTeam.type,
      teamNumber: updateTeamData.teamNumber,
    },
    transaction,
  });
  if (conflict) {
    throw new GraphQLError('Team number already in use', {
      extensions: {
        code: ErrorCode.TEAM_NUMBER_CONFLICT,
        conflictingTeamId: conflict.id,
      },
    });
  }
}
```

**3b. Remove manual name/abbreviation construction** (lines 444–451):

```typescript
// DELETE these lines:
updateTeamData.name = `${dbTeam.club?.name} ${updateTeamData.teamNumber}${getLetterForRegion(dbTeam.type, "vl")}`;
updateTeamData.abbreviation = `${dbTeam.club?.abbreviation} ${updateTeamData.teamNumber}${getLetterForRegion(dbTeam.type, "vl")}`;
```

The `@BeforeUpdate` hook on `dbTeam.update(...)` handles this correctly.

**3c. Update cascade saves to use `{ hooks: false }` for intermediate temp saves**:

```typescript
// Phase 1 — temp save (bypass hook so temp name is not overwritten):
await dbLteam.save({ transaction, hooks: false });

// Phase 2 — final save (hook fires, regenerates name/abbreviation from model methods):
dbCteam.name = undefined; // clear stale/temp value; hook sets it
await dbCteam.save({ transaction }); // @BeforeUpdate fires if teamNumber changed
```

**3d. Remove `_setNameAndAbbreviation` method** — after the above changes it is only called for temp-mode saves. Inline the temp-name construction directly at the two call sites (simpler than keeping the helper):

```typescript
// Inline replacement for _setNameAndAbbreviation(dbLteam, true):
dbLteam.name = `${dbLteam.club?.name ?? ''} ${dbLteam.teamNumber}${getLetterForRegion(dbLteam.type, "vl")}_temp`;
```

Note: temp names only need to be unique; using `club.name` (ignoring enum) is fine here since they are temporary and immediately replaced by the hook on the next save.

---

#### Step 4 — Write model unit tests

**File**: `libs/backend/database/src/models/team.model.spec.ts` (new)

Test the `@BeforeUpdate` hook in isolation:

1. `teamNumber` changed → `generateName` and `generateAbbreviation` called
2. `type` changed → both called
3. Neither changed → neither called (no-op)
4. `@BeforeBulkCreate` — no double abbreviation call (spy on `generateAbbreviation`, expect exactly one call per instance)

Pattern: spy on `Team.generateName` and `Team.generateAbbreviation` static methods. Create a mock instance with `changed()` returning true/false as needed.

---

#### Step 5 — Write resolver tests

**File**: `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`

Add tests for `updateTeam`:

1. Unauthorized → `UnauthorizedException`
2. Team not found → `NotFoundException`
3. Duplicate team number → `GraphQLError` with `TEAM_NUMBER_CONFLICT`
4. Number changes → succeeds, commits transaction, returned team has correct name
5. Type changes → succeeds, name reflects new type notation
6. Unrelated field change → succeeds, name unchanged
7. Exception mid-update → rolls back transaction

Follow the reference pattern from `enrollmentSetting.resolver.spec.ts`:
- `Test.createTestingModule` with mocked `Sequelize`
- `jest.spyOn(Team, 'findByPk')`, `jest.spyOn(Team, 'findOne')`
- Fake `Player` with `hasAnyPermission` jest.fn()
- `afterEach(jest.restoreAllMocks)`

## Complexity Tracking

No constitution violations. No complexity justifications needed.
