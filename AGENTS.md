# Repository guidance (Claude Code, Cursor, AI)

This document is the single source of truth for AI-assisted development in this repo. `CLAUDE.md` is a symlink to this file so Claude Code (claude.ai/code) and Cursor stay aligned.

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

**Shared** (`libs/utils/`): `@badman/utils` — business-logic helpers, enums, config schema, **auto-generated** `i18n.generated.ts` (do not edit manually).

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

### Auth Flow

`PermGuard` (global) validates JWT via Auth0 JWKS (RS256). Routes are **public by default** — the guard only throws on *invalid* tokens. Access control is applied in resolvers via `user.hasAnyPermission()`. The `@User()` decorator extracts `request.user`; returns a stub with `hasAnyPermission: () => false` for unauthenticated requests (or `true` in development env).

### Translation / i18n

- JSON files: `libs/backend/translate/assets/i18n/{en,nl_BE,fr_BE}/all.json`
- Fallback language: `nl_BE`
- Auto-generates `libs/utils/src/lib/i18n.generated.ts` on build (committed but auto-generated; do not edit by hand)
- Single `all` namespace; keys follow dot-notation: `all.button.save`, `all.v1.enrollment.validation.*`
- **Always use the `translation-manager` Cursor agent** to add, update, or remove translation keys so `en`, `nl_BE`, and `fr_BE` stay in sync. Do not change only one locale without mirroring the others (the agent is the preferred workflow).

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
