# Repository guidance (Claude Code, Cursor, AI)

This file (`AGENTS.md`) is the single source of truth for AI-assisted development in this repo.

**`CLAUDE.md` is a symbolic link** to `AGENTS.md` in the repository root (`CLAUDE.md` → `AGENTS.md`). Tools that read either path see the same content. **Edit `AGENTS.md` only**—do not replace the symlink with a duplicate file, or Claude Code and Cursor will drift apart.

## Environment Setup

Required for dev and AI-assisted scripts:

```bash
# pnpm is pinned via the packageManager field; corepack provides it
corepack enable

# Copy .env.local if it doesn't exist (contains LINEAR_API_KEY for issue creation)
cp .env.local.example .env.local  # or manually source .env before running scripts

# Load environment in your shell (add to ~/.zshrc or ~/.bashrc for persistence):
source /path/to/badman/.env.local
```

**Variables needed for scripts:**

- `LINEAR_API_KEY` — for creating Linear issues from CLI

## Project Overview

Competitive badminton management platform (Badman). **Backend-only Turborepo + pnpm monorepo** with NestJS (backend API + workers), Sequelize ORM (PostgreSQL), Apollo GraphQL (code-first), Bull queues (Redis).

**The frontend lives in a separate repository** (Constitution v2.0.0, Principle V). The legacy Angular frontend was removed from this repo; do not reintroduce frontend code here.

Orchestration: Turborepo (`turbo.json`) over pnpm workspaces (`pnpm-workspace.yaml`). Deployable apps live under `apps/`; shared libraries are **compiled internal packages** under `packages/`, imported as `@badman/<name>` and resolved via `workspace:*` dependencies + each package's `exports` map (no tsconfig path aliases).

## Common Commands

```bash
# Install (frozen, what CI runs)
pnpm install --frozen-lockfile

# Start Docker containers (PostgreSQL, Redis, pgAdmin)
npm run docker:up

# Serve API + sync worker in dev (watch mode; builds dependencies first)
pnpm start:server          # = turbo run dev --filter=api --filter=worker-sync

# Serve the ranking workers
pnpm start:ranking

# Build everything / one project (dependencies build first via ^build)
pnpm build                 # = turbo run build
pnpm turbo run build --filter=api
pnpm turbo run build --filter=@badman/backend-graphql

# Run tests for a specific package
pnpm turbo run test --filter=@badman/backend-graphql
# Or run jest directly inside the package (deps must be built once first):
cd packages/backend-graphql && pnpm test

# Run only affected tests (vs a base; CI sets TURBO_SCM_BASE to the PR base)
pnpm turbo run test --affected

# Run integration tests against the dev postgres (docker-compose.dev.yml)
# Off by default; set RUN_INTEGRATION_TESTS=1 to opt in. Files named *.integration.spec.ts
# guard themselves with that env var, so a normal test run skips them.
npm run docker:up
cd packages/backend-graphql && RUN_INTEGRATION_TESTS=1 pnpm exec jest \
  --testPathPattern <feature>.integration

# Lint a specific package
pnpm turbo run lint --filter=@badman/backend-graphql

# Run database migrations
npx sequelize-cli db:migrate

# Format code
prettier --write .
prettier --check .

# Seed test data
npm run seed:test-data

# Full coverage report (all packages, no DB required)
# Produces: text summary per package + lcov.info under root coverage/
pnpm test:coverage:all     # = turbo run test -- --coverage

# Update coverage threshold after adding tests:
# 1. Run: pnpm test:coverage:all
# 2. Find the "Lines %" for backend-graphql in the output
# 3. Round down to nearest 5%
# 4. Edit packages/backend-graphql/jest.config.ts → coverageThreshold.global.*
# 5. Commit the updated jest.config.ts

# Cache notes: turbo caches build/test/lint per package. A no-change re-run is
# near-instant (>>> FULL TURBO). To force re-execution: append --force.
```

## Architecture

### Apps (`apps/`)

- **`apps/api/`** — NestJS GraphQL API (Fastify adapter, port 5010). Built with `nest build` to `apps/api/dist`.
- **`apps/scripts/`** — one-off operational scripts app.
- **`apps/worker/ranking/`** — Bull queue worker for ranking recalculation.
- **`apps/worker/sync/`** — Bull queue worker for federation data sync.
- **`apps/worker/belgium/flanders/places|points/`** — Workers for Belgian Flanders federation data.

Each app builds with `nest build` into its own `dist/` (e.g. `apps/api/dist/main.js`), copies `src/assets` via `nest-cli.json`, and declares its runtime dependencies in its own `package.json` (internal ones as `workspace:*`).

### Packages (import as `@badman/<name>`, `packages/`)

Each package is a compiled workspace library: `tsc` emits to `<pkg>/dist`, consumers resolve through the package `exports`. The package **name equals the import alias** (e.g. `packages/backend-competition/assembly` is `@badman/backend-assembly`). Key ones:

- `@badman/backend-database` — All Sequelize models + `DatabaseModule`
- `@badman/backend-graphql` — All resolvers + `GrapqhlModule` + scalars + query utilities
- `@badman/backend-authorization` — JWT/Auth0 guard (`PermGuard`), `@User()` decorator, `@AllowAnonymous()`
- `@badman/backend-queue` — Bull queue setup, queue name constants
- `@badman/backend-translate` — `nestjs-i18n` module, i18n JSON files (assets ship inside the package's `dist`)
- `@badman/backend-enrollment` — Enrollment validation rule engine
- `@badman/backend-ranking` — Ranking calculation services
- `@badman/utils` — business-logic helpers, enums, config schema, **`i18n.generated.ts`** (emitted by **nestjs-i18n** when the API boots—see Translation / i18n below; never edit manually).

Adding a dependency between packages: add `"@badman/<name>": "workspace:*"` to the consumer's `package.json` and run `pnpm install`. Do NOT add tsconfig path aliases — they were removed in the Turborepo migration.

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

Resolvers live in `packages/backend-graphql/src/resolvers/<domain>/`. Each domain has `*.resolver.ts`, `*.module.ts`, `*.resolver.spec.ts`.

- Queries call model statics directly (`Model.findAll`, `Model.findByPk`)
- Mutations always use a Sequelize transaction with commit/rollback
- Auth is checked manually in resolvers via `user.hasAnyPermission([...])`
- Slug support: `IsUUID(id)` decides between `findByPk` and `findOne({ where: { slug } })`
- Paged results use inline `@ObjectType()` with `{ count: number; rows: T[] }`
- `ListArgs` / `queryFixer()` utilities translate GraphQL filter operators to Sequelize `Op` symbols
- **Classified errors**: when a mutation needs to expose distinct, machine-readable failure modes to clients, throw `GraphQLError` from the `graphql` package with `extensions.code` set to a constant from the shared registry [`packages/backend-graphql/src/utils/error-codes.ts`](packages/backend-graphql/src/utils/error-codes.ts) (`ErrorCode.PERMISSION_DENIED`, `ErrorCode.INTERNAL_ERROR`, etc.). Do NOT inline string literals — clients pin behavior to these codes and the registry is the single source of truth. Adding a new code: append a key to `error-codes.ts` and document the per-code `extensions` payload in the resolver's contract document under `specs/`. Reference implementations: [`enrollment.resolver.ts`](packages/backend-graphql/src/resolvers/event/competition/enrollment.resolver.ts) and [`team.resolver.ts`](packages/backend-graphql/src/resolvers/team/team.resolver.ts) (`createEnrollment` / `createTeam`).
- **Idempotent create mutations**: when a create mutation has a natural uniqueness key (e.g. `(link, season)` for teams, `(teamId, subEventId)` for enrollments, `(clubId, playerId, season, type)` for club memberships), it MUST be idempotent on re-submission. Return a result `@ObjectType` carrying the entity's identifiers plus `alreadyExisted: boolean` (`true` = existing row matched, no write; `false` = fresh row created). Do NOT throw a duplicate error. Reference implementations: `TeamResult` ([`team-result.object.ts`](packages/backend-graphql/src/resolvers/team/team-result.object.ts)) and `EnrollmentResult` ([`enrollment-result.object.ts`](packages/backend-graphql/src/resolvers/event/competition/enrollment-result.object.ts)). See Constitution Principle III.

### Auth Flow

`PermGuard` (global) validates JWT via Auth0 JWKS (RS256). Routes are **public by default** — the guard only throws on _invalid_ tokens. Access control is applied in resolvers via `user.hasAnyPermission()`. The `@User()` decorator extracts `request.user`; returns a stub with `hasAnyPermission: () => false` for unauthenticated requests (or `true` in development env).

### Translation / i18n

- JSON files: `packages/backend-translate/assets/i18n/{en,nl_BE,fr_BE}/all.json`
- Fallback language: `nl_BE`
- Single `all` namespace; keys follow dot-notation: `all.button.save`, `all.v1.enrollment.validation.*`
- At build time the package copies `assets/` into its own `dist/`; the translate module resolves them via `__dirname`, so no app-level asset copying exists.

#### `packages/utils/src/lib/i18n.generated.ts` (nestjs-i18n — do not edit)

That file is **not** hand-maintained. **nestjs-i18n** writes it when the API process starts, using `typesOutputPath` in `packages/backend-translate/src/translate.module.ts` (it merges loaded JSON into TypeScript types). **Never edit `i18n.generated.ts` manually**—not even to “match” JSON changes.

After you change `all.json`, regenerate the types by **starting the API once** (e.g. `pnpm turbo run dev --filter=api`) and wait until the log shows types were written, or rely on your usual dev server. Commit the updated `i18n.generated.ts` together with the JSON changes once the process has regenerated it.

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
- Migrations are independent of the task runner (no turbo involvement).

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

## Releases (release-please)

Versioning is **commit-driven** — contributors never hand-author release metadata. Write Conventional Commits (`feat:`, `fix:`, `feat!:`/`BREAKING CHANGE:`); [`release-please.yml`](.github/workflows/release-please.yml) maintains a release PR on `main`. Merging that PR bumps the single repo-wide version (`package.json` + every app's `src/version.json` via `release-please-config.json`), writes `CHANGELOG.md`, tags `vX.Y.Z` and creates the GitHub release. `deploy-production.yml` ships whatever version the current `main` commit carries and verifies the live `/api/v1/version` afterwards.

## Testing

- Test runner: Jest, configured per package (`<pkg>/jest.config.ts`, shared base in root `jest.preset.js`)
- Run via turbo (`pnpm turbo run test --filter=<pkg>`) or directly inside a package (`pnpm test`); cross-package imports resolve to built `dist`, so build dependencies once first (`turbo` does this automatically via `^build`)
- Test files are co-located next to the source file: `foo.resolver.ts` → `foo.resolver.spec.ts`
- Use `@nestjs/testing` `Test.createTestingModule` to wire up the unit under test with mocked dependencies

### Integration test convention

Integration tests exercise behaviour that unit tests cannot fake — real infrastructure (Redis, postgres-only features), external APIs, multi-row transaction semantics. **They are skipped by default and never run in the CI gate** — each suite opts in explicitly. Current examples:

- [`apps/worker/sync/src/app/queue/__tests__/queue.integration.spec.ts`](apps/worker/sync/src/app/queue/__tests__/queue.integration.spec.ts) — Bull queue against `redis-memory-server`. Gated behind `RUN_INTEGRATION_TESTS=1`. **Caveat**: `redis-memory-server` downloads and compiles Redis from source on first run (takes minutes, then caches the binary per machine) — this is exactly why the suite must never run in the default/CI path.
- [`packages/backend-visual/src/__integration__/visual.service.integration.spec.ts`](packages/backend-visual/src/__integration__/visual.service.integration.spec.ts) — real VR/Visual API. Gated on credentials presence (`VR_API_USER`/`VR_API_PASS`); skips itself when they're absent.

Conventions:

1. **Filename** — `*.integration.spec.ts`, co-located with the unit under test (`foo.service.ts` → `foo.integration.spec.ts`).
2. **Opt-in gate** — guard the entire suite so default test runs skip it: `const describeOrSkip = process.env["RUN_INTEGRATION_TESTS"] === "1" ? describe : describe.skip;` for infrastructure-heavy suites, or a credentials-presence check for suites that call external APIs. A suite that runs unguarded in the CI gate is a bug (cold runners make infra-heavy suites flaky — see the Redis-compile caveat above).
3. **Connection** — load `.env` via `dotenv`, build a fresh `new Sequelize({ dialect: 'postgres', host: DB_IP, ... , models: <all models from @badman/backend-database> })`. Pass every model exported from the barrel (cross-model associations need the full graph). Skip the suite (warn, don't fail) when `DB_DIALECT` is not `postgres`.
4. **Sentinel scope** — pick a season number that cannot collide with seed/dev data (e.g. `9999`) and create an ad-hoc test club in `beforeAll`. Use `Op.in` cleanup keyed on `clubId + season`.
5. **Self-clean** — `beforeEach` wipes the sentinel scope; `afterAll` deletes the club, the suite-owned players + rankings, and closes the connection. Never leak rows past the suite.
6. **Construct services directly** — for service-level integration tests, instantiate the service with `new MyService(sequelize)` rather than spinning up a full `Test.createTestingModule`. Resolver-level integration tests may use the testing module if they need DI.

Run via the integration-test command in the Common Commands block above.

### Resolver test convention

See the reference implementation in `packages/backend-graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`.

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

Workflows live in [`.github/workflows/`](.github/workflows/). Match the workflow to the branch you are working on — see [Branching](#branching) for base-branch rules. All workflows install with `pnpm install --frozen-lockfile` via the [`setup-monorepo`](.github/actions/setup-monorepo/action.yml) composite action, which also restores the Turborepo local cache.

| Workflow                                                             | Trigger                                             | Purpose                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`pull-request.yml`](.github/workflows/pull-request.yml)             | `pull_request`, `merge_group`                       | Fast PR gate: `pnpm turbo run lint test --affected` against the PR base (`TURBO_SCM_BASE`). Build is **deliberately excluded** — deploy workflows handle it.                                                                                                                                                                                                    |
| [`deploy-staging.yml`](.github/workflows/deploy-staging.yml)         | `push` to `staging`, `workflow_dispatch`            | Full-graph `lint test build` (turbo cache keeps unchanged packages near-free) → run migrations against staging DB → `turbo run deploy` (Render hooks). Calls `_shared-migrate.yml`.                                                                                                                                                                             |
| [`deploy-production.yml`](.github/workflows/deploy-production.yml)   | `push` to `main`, `workflow_dispatch`               | Full-graph `lint test build` → migrations against prod DB → `turbo run deploy` → verify live `/api/v1/version` reports the shipped version → Sentry release (only when the push bumped the version). The `main` → `develop` back-merge step is **currently disabled** (main intentionally diverges from develop); re-enable once branches align.                |
| [`release-please.yml`](.github/workflows/release-please.yml)         | `push` to `main`                                    | Maintains the commit-driven release PR; merging it bumps versions, writes CHANGELOG, tags `vX.Y.Z`, creates the GitHub release. Replaces `nx release`.                                                                                                                                                                                                          |
| [`_shared-migrate.yml`](.github/workflows/_shared-migrate.yml)       | `workflow_call` (reusable)                          | Applies pending Sequelize migrations against `target-environment` input (`staging` \| `production`). Production env requires manual reviewer approval. Concurrency group `migrate-<env>` with `cancel-in-progress: false` so a mid-flight migration cannot be cancelled. Pre-flight invalid-index check guards against interrupted `CREATE INDEX CONCURRENTLY`. |
| [`generate-cp.yml`](.github/workflows/generate-cp.yml)               | `workflow_dispatch` (backend webhook)               | Windows runner builds `@badman/backend-generator` via turbo and produces a `.cp` file from a Gist payload.                                                                                                                                                                                                                                                      |
| [`claude-code-review.yml`](.github/workflows/claude-code-review.yml) | `pull_request` against `main`                       | Auto Claude review on PRs targeting `main`.                                                                                                                                                                                                                                                                                                                     |
| [`claude.yml`](.github/workflows/claude.yml)                         | `@claude` mention in issues / PR comments / reviews | On-demand Claude agent for repo.                                                                                                                                                                                                                                                                                                                                |
| [`cla.yaml`](.github/workflows/cla.yaml)                             | PRs from external contributors                      | CLA signature gate.                                                                                                                                                                                                                                                                                                                                             |

### Main → develop back-merge (currently disabled)

The back-merge step in `deploy-production.yml` is **disabled** for now because `main` intentionally lags `develop` (CP export and backend encounter games generation are held back from prod). Auto back-merge would wipe those features from `develop`.

When re-enabling the step, keep the per-deploy opt-out gate: include the literal marker `[skip back-merge]` in the merge commit message on `main` and the workflow will skip that run via `!contains(github.event.head_commit.message, '[skip back-merge]')`. Use it whenever `main` should not flow back to `develop` for a specific deploy (e.g. another feature removal). After skipping, do NOT manually back-merge — cherry-pick or rebase the specific commits if needed.

### Rules for changes

- Editing a workflow → run `actionlint` mentally (or via pre-commit); keep `--affected` + `TURBO_SCM_BASE` on the PR gate, full-graph runs on deploys.
- Adding a deploy step that touches the DB → call `_shared-migrate.yml`. Do **not** add a parallel migration job; the shared workflow holds the concurrency lock and env-protection contract.
- Long-running or destructive step → set `concurrency.cancel-in-progress: false` to prevent half-applied state.
- New env-scoped secrets → bind them through the `environment:` key on the job, not at the workflow level, so non-prod runs cannot read prod creds.
- Render builds the apps server-side from its dashboard build command (`pnpm install --frozen-lockfile && pnpm turbo run build --filter=<svc>`; start: `node -r dotenv/config --max-old-space-size=1536 apps/<path>/dist/main.js` — keep the pre-existing Node flags; the heap cap forces GC before Render's container memory limit, preventing hard OOM kills). Changing build output paths requires a matching dashboard update.

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
[specs/036-nx-to-turborepo/plan.md](specs/036-nx-to-turborepo/plan.md)

<!-- SPECKIT END -->
