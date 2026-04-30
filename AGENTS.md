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

### Auth Flow

`PermGuard` (global) validates JWT via Auth0 JWKS (RS256). Routes are **public by default** — the guard only throws on *invalid* tokens. Access control is applied in resolvers via `user.hasAnyPermission()`. The `@User()` decorator extracts `request.user`; returns a stub with `hasAnyPermission: () => false` for unauthenticated requests (or `true` in development env).

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

- For new features, always create a new branch from `develop` (unless it's a hotfix or specified otherwise) with a descriptive name (e.g. `feat/enrollment-settings`, `fix/login-redirect`).

## Testing

- Test runner: Jest (via Nx or directly: `npx jest --config <lib>/jest.config.ts`)
- Test files are co-located next to the source file: `foo.resolver.ts` → `foo.resolver.spec.ts`
- Use `@nestjs/testing` `Test.createTestingModule` to wire up the unit under test with mocked dependencies

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

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
[specs/002-team-resolver-improvements/plan.md](specs/002-team-resolver-improvements/plan.md)
<!-- SPECKIT END -->
