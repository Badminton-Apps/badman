# Badman

Competitive badminton management platform. Monorepo using Nx, NestJS (backend), Next.js (frontend), Sequelize (ORM), Apollo GraphQL.

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
