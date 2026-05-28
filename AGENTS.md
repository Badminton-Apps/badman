# Repository guidance (Claude Code, Cursor, AI)

This file (`AGENTS.md`) is the single source of truth for AI-assisted development in this repo.

**`CLAUDE.md` is a symbolic link** to `AGENTS.md` in the repository root (`CLAUDE.md` → `AGENTS.md`). Tools that read either path see the same content. **Edit `AGENTS.md` only**—do not replace the symlink with a duplicate file, or Claude Code and Cursor will drift apart.

## Project Overview

Competitive badminton management platform (Badman). Nx monorepo with NestJS (backend API + workers), Sequelize ORM (PostgreSQL), Apollo GraphQL (code-first), Bull queues (Redis).

**IMPORTANT:** The Angular frontend code in this repo (`apps/badman/`, `libs/frontend/`) is **LEGACY** and must NOT be used for new development. It exists only as a reference. The active frontend lives in a separate repository.

## Common Commands

```bash
# Start Docker containers (PostgreSQL, Redis, pgAdmin)
npm run docker:up

# Serve API + sync worker in dev
nx run-many --target=serve --projects=api,worker-sync --parallel

# Build a specific project
nx build api
nx build backend-graphql

# Run tests for a specific lib
nx test backend-graphql
# Or directly:
npx jest --config libs/backend/graphql/jest.config.ts

# Run only affected tests
nx affected:test

# Run integration tests against the dev postgres (docker-compose.dev.yml)
# Off by default; set RUN_INTEGRATION_TESTS=1 to opt in. Files named *.integration.spec.ts
# guard themselves with that env var, so a normal `nx test` run skips them.
npm run docker:up
RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/graphql/jest.config.ts \
  --testPathPattern <feature>.integration

# Lint a specific project
nx lint backend-graphql

# Run database migrations
npx sequelize-cli db:migrate

# Format code
prettier --write .
prettier --check .

# Seed test data
npm run seed:test-data
```

## Architecture

### Apps

- **`apps/api/`** — NestJS GraphQL API (Fastify adapter, port 5010). Serves Angular frontend as static files in production.
- **`apps/badman/`** — **LEGACY** Angular frontend. Do not modify; reference only.
- **`apps/worker/ranking/`** — Bull queue worker for ranking recalculation.
- **`apps/worker/sync/`** — Bull queue worker for federation data sync.
- **`apps/worker/belgium/flanders/places|points/`** — Workers for Belgian Flanders federation data.

### Libs (import as `@badman/<name>`)

**Backend** (`libs/backend/`): Each lib is a buildable NestJS module. Key ones:

- `@badman/backend-database` — All Sequelize models + `DatabaseModule`
- `@badman/backend-graphql` — All resolvers + `GrapqhlModule` + scalars + query utilities
- `@badman/backend-authorization` — JWT/Auth0 guard (`PermGuard`), `@User()` decorator, `@AllowAnonymous()`
- `@badman/backend-queue` — Bull queue setup, queue name constants
- `@badman/backend-translate` — `nestjs-i18n` module, i18n JSON files
- `@badman/backend-enrollment` — Enrollment validation rule engine
- `@badman/backend-ranking` — Ranking calculation services

**Shared** (`libs/utils/`): `@badman/utils` — business-logic helpers, enums, config schema, **`i18n.generated.ts`** (emitted by **nestjs-i18n** when the API boots—see Translation / i18n below; never edit manually).

**Frontend** (`libs/frontend/`): **LEGACY** Angular libs. Reference only — do not modify.

### Sequelize Models (Code-First GraphQL)

Models serve double duty — they are both Sequelize ORM entities AND GraphQL `@ObjectType` declarations:

```typescript
@Table({ timestamps: true, schema: "public" })
@ObjectType("Player")
export class Player extends Model<...> {
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  declare id: string;
}
```

Input types are derived via `PartialType`/`OmitType` from the same model class. Models are organized by schema: `public`, `event`, `ranking`, `security`, `system`, `personal`.

### Resolver Pattern

Resolvers live in `libs/backend/graphql/src/resolvers/<domain>/`. Each domain has `*.resolver.ts`, `*.module.ts`, `*.resolver.spec.ts`.

- Queries call model statics directly (`Model.findAll`, `Model.findByPk`)
- Mutations always use a Sequelize transaction with commit/rollback
- Auth is checked manually in resolvers via `user.hasAnyPermission([...])`
- Slug support: `IsUUID(id)` decides between `findByPk` and `findOne({ where: { slug } })`
- Paged results use inline `@ObjectType()` with `{ count: number; rows: T[] }`
- `ListArgs` / `queryFixer()` utilities translate GraphQL filter operators to Sequelize `Op` symbols
- **Classified errors**: when a mutation needs to expose distinct, machine-readable failure modes to clients, throw `GraphQLError` from the `graphql` package with `extensions.code` set to a constant from the shared registry [`libs/backend/graphql/src/utils/error-codes.ts`](libs/backend/graphql/src/utils/error-codes.ts) (`ErrorCode.PERMISSION_DENIED`, `ErrorCode.INTERNAL_ERROR`, etc.). Do NOT inline string literals — clients pin behavior to these codes and the registry is the single source of truth. Adding a new code: append a key to `error-codes.ts` and document the per-code `extensions` payload in the resolver's contract document under `specs/`. Reference implementations: [`enrollment.resolver.ts`](libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts) and [`team.resolver.ts`](libs/backend/graphql/src/resolvers/team/team.resolver.ts) (`createEnrollment` / `createTeam`).
- **Idempotent create mutations**: when a create mutation has a natural uniqueness key (e.g. `(link, season)` for teams, `(teamId, subEventId)` for enrollments, `(clubId, playerId, season, type)` for club memberships), it MUST be idempotent on re-submission. Return a result `@ObjectType` carrying the entity's identifiers plus `alreadyExisted: boolean` (`true` = existing row matched, no write; `false` = fresh row created). Do NOT throw a duplicate error. Reference implementations: `TeamResult` ([`team-result.object.ts`](libs/backend/graphql/src/resolvers/team/team-result.object.ts)) and `EnrollmentResult` ([`enrollment-result.object.ts`](libs/backend/graphql/src/resolvers/event/competition/enrollment-result.object.ts)). See Constitution Principle III.

### Auth Flow

`PermGuard` (global) validates JWT via Auth0 JWKS (RS256). Routes are **public by default** — the guard only throws on _invalid_ tokens. Access control is applied in resolvers via `user.hasAnyPermission()`. The `@User()` decorator extracts `request.user`; returns a stub with `hasAnyPermission: () => false` for unauthenticated requests (or `true` in development env).

### Translation / i18n

- JSON files: `libs/backend/translate/assets/i18n/{en,nl_BE,fr_BE}/all.json`
- Fallback language: `nl_BE`
- Single `all` namespace; keys follow dot-notation: `all.button.save`, `all.v1.enrollment.validation.*`

#### `libs/utils/src/lib/i18n.generated.ts` (nestjs-i18n — do not edit)

That file is **not** hand-maintained. **nestjs-i18n** writes it when the API process starts, using `typesOutputPath` in `libs/backend/translate/src/translate.module.ts` (it merges loaded JSON into TypeScript types). **Never edit `i18n.generated.ts` manually**—not even to “match” JSON changes.

After you change `all.json`, regenerate the types by **starting the API once** (e.g. `nx run api:serve`) and wait until the log shows types were written, or rely on your usual dev server. Commit the updated `i18n.generated.ts` together with the JSON changes once the process has regenerated it.

The **`translation-manager` agent** updates **`all.json` only** (all locales). It does not replace nestjs-i18n for the `.ts` file.

#### `translation-manager` — non-negotiable

**Before changing any `all.json` content, invoke the `translation-manager` Cursor agent.** Do not “quickly” edit JSON yourself, and **do not** use shell one-offs (`node -e`, `jq`, piping through `JSON.stringify`, bulk find-replace, or re-serializing entire files) to move, merge, rename, or flatten keys. That is still i18n work and belongs in the agent.

The agent must be used for **all** of the following (not only new copy):

- Adding or editing strings in **any** locale
- **Restructuring**: flattening a nested object, merging two branches, renaming a parent key (e.g. moving children out of `clubEnrollment` into `enrollment`)
- Renaming or relocating keys across files
- Tables with **Key / EN / NL** (or similar)

**Forbidden as a substitute for the agent:** implementing the same change yourself “because it’s just structural” or “because it’s faster.” If three locales are involved, use **`translation-manager` first** for JSON; then run the API so **`i18n.generated.ts`** is regenerated by nestjs-i18n.

Typical user phrases that mean “use `translation-manager` now”: “add translations”, “move these keys”, “rename the namespace”, “sync i18n”, “flatten … under …”.

### Database Migrations

- Location: `database/migrations/` (date-prefixed JS files)
- Config: `.sequelizerc` → `database/config/config.js` (reads from `.env`)
- Run: `npx sequelize-cli db:migrate`
- Pattern: plain JS with `up`/`down` functions, all wrapped in transactions

### Worker Pattern

Workers are lean NestJS apps importing only needed modules. Bull processors use `@Processor({ name })` and `@Process(jobName)` decorators. Queues: `ranking`, `sync`, `badminton-belgium-flanders-points`, `badminton-belgium-flanders-places`.

## Branching

**Base branch is load-bearing.** A wrong base mixes unreleased work into a hotfix lane, or strands a prod fix behind unreleased features. Get this right before the first commit.

### Decision rules

- **Base off `develop`** → PR target `develop`. Use for: `feat/*`, `refactor/*`, `chore/*`, `perf/*`, `test/*`, `docs/*`, and any `fix/*` for a bug that is **not yet in production** (i.e. only exists on `develop` or a feature branch).
- **Base off `main`** → PR target `main`. Use ONLY for `hotfix/*` fixing a bug that is **already shipped to production**. After merge to `main`, back-merge `main` into `develop` so the fix is not lost.
- **Never** base off `develop` and PR into `main` (drags unreleased features into prod). **Never** base off `main` and PR into `develop` for non-hotfix work.

### When in doubt, ASK — do not guess

Before creating a branch, if any of the following is unclear, stop and ask the user explicitly:

1. Is the bug **already in production on `main`**, or only on `develop`/a feature branch?
2. Does the user want this **shipped immediately** (hotfix path) or **bundled in the next release** (develop path)?
3. The branch name uses `fix/*` — is it a hotfix (`main`) or a regular fix (`develop`)?

Phrase the question concretely, e.g. _"Is this fixing a bug live in production (→ branch off `main`, PR into `main`), or a bug only on `develop` (→ branch off `develop`, PR into `develop`)?"_ Do not proceed until answered.

### Naming

Descriptive kebab-case after the type prefix: `feat/enrollment-settings`, `fix/login-redirect`, `hotfix/ranking-null-deref`, `chore/remove-cp-export`.

## Testing

- Test runner: Jest (via Nx or directly: `npx jest --config <lib>/jest.config.ts`)
- Test files are co-located next to the source file: `foo.resolver.ts` → `foo.resolver.spec.ts`
- Use `@nestjs/testing` `Test.createTestingModule` to wire up the unit under test with mocked dependencies

### Integration test convention

Integration tests exercise behaviour that unit tests cannot fake — postgres-only features (advisory locks, deferred constraints), real association loading, multi-row transaction semantics. Reference: [`libs/backend/graphql/src/resolvers/team/team-renumbering.integration.spec.ts`](libs/backend/graphql/src/resolvers/team/team-renumbering.integration.spec.ts).

Conventions:

1. **Filename** — `*.integration.spec.ts`, co-located with the unit under test (`foo.service.ts` → `foo.integration.spec.ts`).
2. **Opt-in gate** — guard the entire `describe` with `process.env["RUN_INTEGRATION_TESTS"] === "1"`. Default `nx test` runs MUST skip them.
3. **Connection** — load `.env` via `dotenv`, build a fresh `new Sequelize({ dialect: 'postgres', host: DB_IP, ... , models: <all models from @badman/backend-database> })`. Pass every model exported from the barrel (cross-model associations need the full graph). Skip the suite (warn, don't fail) when `DB_DIALECT` is not `postgres`.
4. **Sentinel scope** — pick a season number that cannot collide with seed/dev data (e.g. `9999`) and create an ad-hoc test club in `beforeAll`. Use `Op.in` cleanup keyed on `clubId + season`.
5. **Self-clean** — `beforeEach` wipes the sentinel scope; `afterAll` deletes the club, the suite-owned players + rankings, and closes the connection. Never leak rows past the suite.
6. **Construct services directly** — for service-level integration tests, instantiate the service with `new MyService(sequelize)` rather than spinning up a full `Test.createTestingModule`. Resolver-level integration tests may use the testing module if they need DI.

Run via the integration-test command in the Common Commands block above.

### Resolver test convention

See the reference implementation in `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`.

Pattern:

1. **Module setup** — use `Test.createTestingModule` with the resolver as a provider and mock `Sequelize` (fake `transaction()` returning `{ commit, rollback }` stubs).
2. **Model mocks** — use `jest.spyOn(Model, 'staticMethod')` (e.g. `findOne`, `findAll`) to mock Sequelize model statics. Do NOT import the real database.
3. **Auth mocks** — create a fake `Player` with a `hasAnyPermission` jest.fn() to test authorized and unauthorized paths.
4. **Cleanup** — `afterEach(() => jest.restoreAllMocks())` for isolation.
5. **Cases to cover for a standard CRUD resolver:**
   - Query returns data
   - Query returns null/empty when nothing exists
   - Mutation rejects unauthorized users (`UnauthorizedException`)
   - Mutation handles not-found (`NotFoundException`)
   - Mutation succeeds: updates, commits transaction, returns result
   - Mutation rolls back on unexpected errors

## CI / GitHub Actions

Workflows live in [`.github/workflows/`](.github/workflows/). Match the workflow to the branch you are working on — see [Branching](#branching) for base-branch rules.

| Workflow | Trigger | Purpose |
|---|---|---|
| [`pull-request.yml`](.github/workflows/pull-request.yml) | `pull_request`, `merge_group` | Fast PR gate: `nx affected -t lint test -c ci` against `develop` (or PR base). Build is **deliberately excluded** — deploy workflows handle it. Legacy frontend + e2e excluded (Constitution V). |
| [`deploy-staging.yml`](.github/workflows/deploy-staging.yml) | `push` to `staging`, `workflow_dispatch` | Build affected → run migrations against staging DB → deploy. Calls `_shared-migrate.yml`. |
| [`deploy-production.yml`](.github/workflows/deploy-production.yml) | `push` to `main`, `workflow_dispatch` | Build affected (NX_BASE = last `v*` tag) → create release tag → run migrations against prod DB → deploy. The `main` → `develop` back-merge step is **currently commented out** (main intentionally diverges from develop); re-enable once branches align. Calls `_shared-migrate.yml`. |
| [`_shared-migrate.yml`](.github/workflows/_shared-migrate.yml) | `workflow_call` (reusable) | Applies pending Sequelize migrations against `target-environment` input (`staging` \| `production`). Production env requires manual reviewer approval. Concurrency group `migrate-<env>` with `cancel-in-progress: false` so a mid-flight migration cannot be cancelled. Pre-flight invalid-index check guards against interrupted `CREATE INDEX CONCURRENTLY`. |
| [`claude-code-review.yml`](.github/workflows/claude-code-review.yml) | `pull_request` against `main` | Auto Claude review on PRs targeting `main`. |
| [`claude.yml`](.github/workflows/claude.yml) | `@claude` mention in issues / PR comments / reviews | On-demand Claude agent for repo. |
| [`cla.yaml`](.github/workflows/cla.yaml) | PRs from external contributors | CLA signature gate. |

### Main → develop back-merge (currently disabled)

The back-merge step in `deploy-production.yml` is **commented out** for now because `main` intentionally lags `develop` (CP export and backend encounter games generation are held back from prod). Auto back-merge would wipe those features from `develop`.

When re-enabling the step, keep the per-deploy opt-out gate: include the literal marker `[skip back-merge]` in the merge commit message on `main` and the workflow will skip that run via `!contains(github.event.head_commit.message, '[skip back-merge]')`. Use it whenever `main` should not flow back to `develop` for a specific deploy (e.g. another feature removal). After skipping, do NOT manually back-merge — cherry-pick or rebase the specific commits if needed.

### Rules for changes

- Editing a workflow → run `actionlint` mentally (or via pre-commit); ensure `nx affected` invocations keep `--exclude="${{ steps.legacy.outputs.list }}"` and `-c ci`.
- Adding a deploy step that touches the DB → call `_shared-migrate.yml`. Do **not** add a parallel migration job; the shared workflow holds the concurrency lock and env-protection contract.
- Long-running or destructive step → set `concurrency.cancel-in-progress: false` to prevent half-applied state.
- New env-scoped secrets → bind them through the `environment:` key on the job, not at the workflow level, so non-prod runs cannot read prod creds.

## Reference docs (`docs/`)

Long-form internal docs live under [`docs/`](docs/). Skim the relevant ones before starting work in those areas.

- [`docs/tech-debt.md`](docs/tech-debt.md) — registry of knowing compromises. Read before introducing one; update in the same commit. Versioned at the top.
- [`docs/enrollment-old-vs-new.md`](docs/enrollment-old-vs-new.md) — side-by-side comparison of the legacy Angular enrollment wizard vs the new Next.js implementation, with backend cross-references (`createEnrollment`, `createTeam`, `createTeams`, ranking-snapshot logic, validation rules). Read before touching enrollment, team-create, or the new frontend's submit flow.
- [`docs/admin-permissions.md`](docs/admin-permissions.md) — permission catalog and `${entityId}_edit:*` conventions used by `user.hasAnyPermission(...)` in resolvers.
- [`docs/ranking-sync.md`](docs/ranking-sync.md), [`docs/ranking-sync-improvements.md`](docs/ranking-sync-improvements.md), [`docs/ranking-sync-recovery.md`](docs/ranking-sync-recovery.md) — federation-sync architecture and operational playbooks for the worker-sync app.
- [`docs/sync-process.md`](docs/sync-process.md) — overall sync pipeline.
- [`docs/settings-api-guide.md`](docs/settings-api-guide.md), [`docs/enrollment-settings-frontend.md`](docs/enrollment-settings-frontend.md) — enrollment-settings API + FE guidance.
- [`docs/enter-scores-local-browser.md`](docs/enter-scores-local-browser.md) — local-dev workflow for scoring.
- [`docs/guides/`](docs/guides/), [`docs/estimates/`](docs/estimates/) — assorted how-to guides and feature estimates.

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
[specs/030-ci-lean-migrations/plan.md](specs/030-ci-lean-migrations/plan.md)

<!-- SPECKIT END -->
