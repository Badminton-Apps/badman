# Quickstart: Developing after the Turborepo migration

Command cheat-sheet for the post-cutover repo. Old Nx command → new Turborepo/pnpm command.

## Setup

```bash
corepack enable                 # provides pnpm at the pinned version
pnpm install                    # was: npm install / npm ci
npm run docker:up               # unchanged — Postgres/Redis/pgAdmin
```

## Everyday commands

| Task                    | Old (Nx)                                                           | New (Turborepo + pnpm)                                                |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Serve API + sync worker | `nx run-many --target=serve --projects=api,worker-sync --parallel` | `pnpm dev --filter=api --filter=worker-sync`                          |
| Serve ranking workers   | `npm run start:ranking`                                            | `pnpm dev --filter=worker-ranking --filter=worker-belgium-flanders-*` |
| Build one project       | `nx build api`                                                     | `pnpm turbo run build --filter=api`                                   |
| Build everything        | `nx run-many -t build`                                             | `pnpm build` (→ `turbo run build`)                                    |
| Test one package        | `nx test backend-graphql`                                          | `pnpm turbo run test --filter=@badman/backend-graphql`                |
| Test affected           | `nx affected:test`                                                 | `pnpm turbo run test --affected`                                      |
| Lint one project        | `nx lint backend-graphql`                                          | `pnpm turbo run lint --filter=@badman/backend-graphql`                |
| Integration tests       | `RUN_INTEGRATION_TESTS=1 npx jest …`                               | unchanged (run package's jest directly, env gate retained)            |
| Migrations              | `npx sequelize-cli db:migrate`                                     | unchanged                                                             |
| Coverage (all)          | `npm run test:coverage:all`                                        | `pnpm turbo run test -- --coverage` (threshold gate retained)         |

## Adding a new shared package

1. `mkdir packages/backend-foo && cd packages/backend-foo`
2. Add `package.json` (`name: "@badman/backend-foo"`, `exports`, `build`/`test`/`lint` scripts) — see [contracts/package-manifest.md](contracts/package-manifest.md).
3. Add `tsconfig.json` extending `@badman/typescript-config/library.json`, emitting `dist`.
4. In each consumer add `"@badman/backend-foo": "workspace:*"` to `dependencies`, then `pnpm install`.
5. Import as `@badman/backend-foo` — no `tsconfig.paths` entry needed.

## Releasing

- Commit with Conventional Commits (`feat:`, `fix:`, `feat!:`…). No changelog/version file to hand-author.
- release-please maintains a "release PR"; merging it bumps the single repo-wide version, writes the changelog, tags, and creates the GitHub release. Push to `main` deploys (Render hooks) — same as today.

## Gotchas

- **Phantom dependency**: if a build/test fails with "cannot find module `@badman/x`", the package imports `@badman/x` but doesn't declare it — add it to that package's `dependencies` and `pnpm install`. (pnpm strictness, by design.)
- **Cache "too good"**: stale result suspected → `pnpm turbo run build --force` to bypass cache; check the task declares correct `outputs`.
- **Watch not reloading**: `dev` is non-cacheable + persistent; ensure you ran via `pnpm dev` (turbo), not a stale `nest start`.
- **Render deploy**: build runs on Render with the dashboard build command (`pnpm install && pnpm turbo run build --filter=<svc>`), not in CI.
