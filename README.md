# Badman

### 1. Environment values

- copy `.env.example` to `.env`
- And fill in the values (Request complete set of ENV variables from PandaPanda Team)

### 2. Install dependencies

```bash
corepack enable   # provides pnpm at the version pinned in package.json
pnpm install
```

(currently using node 22.22.3 — see `.nvmrc`; `nvm use` or volta picks it up automatically)

### 3. Creating database

- Install posgres locally if not already installed
- create database called "badman-db" (using psql command line tool)
- give all privileges to user called "panda" (and create said user if not already created)
- Once database created, do the following to ensure `postgis` will work in app:
  - Use your global package manager (usually brew on mac) to install `postgis`
    - mac command: `brew install postgis`
  - run `\c "badman-db";` to create connection to database
  - run `CREATE EXTENSION postgis;`

### 4. Restoring database

It is best to restore your local database with a copy of the production database, so you will have lots of test data to work with.

- use psql cmmand line, PGAdmin or another database explorer tool to restore from a backup
- note: if the `postgis` configuration is not completed, the locations table will not successfully restore from backup!

### 5. Start redis server

- easiest: `npm run docker:up` (starts PostgreSQL, Redis and pgAdmin from `docker-compose.dev.yml`)
- or run a local redis manually: `redis-server --port 6379`

### 6. Start client and server

- run: `pnpm start:server` for the API + sync worker in watch mode (API on port 5010)
- the frontend lives in the separate `badman-frontend` repository (the legacy Angular client was removed from this repo)

### 7. Run database migrations (if first time runninf)

- run migrations `npx --yes sequelize-cli db:migrate`

### 8. Authentication and user management

The badman app uses `Auth0` for user management and authentication. In order to log into the app, you will need to create an account on the auth0 system, and then "claim"
that account within the badman application.

Because we are using a copy of production data locally, and becuase you will ideally want to be logged in with users that are linked to clubs and teams, you will first create an account in auth0 (using your own email and password), and then "link" that account to the user you wish to log in as within your database. It helps tremendously to use a database explorer tool like PGAdmin to accomplish this!

Steps:

- navigate to the login page of application (either of legacy client app, or in the `badman-frontend` application)
- click `sign up` at bottom of login card, and follow steps to login
- open a new tab, and navigate to auth0.com. Click `Login`
- Login to Auth0 (ask PandaPanda for login credentials)
- Navigate to `User Management > users`
- Search for the user account you just created, and copy the `userId`
- In PGAdmin:
  - Find the public."Players" table, and search for the player you would like to login as.
  - When you find a player, add the `userId` from `Auth0` into the `sub` column for that record. Save the changes.
  - Your Auth0 credentials are now linked to this user account locally! You will be able to see their data,

### 9. Async workers

There are currently 2 async workers that can be run on the application, which sync various data to and from `Toernooi.nl`, the platform that serves as the source of truth for all competition and tournament scheduling, clubs and teams, encounter results, and player rankings. The workers are:

- `Ranking`: syncs all player ranking data, as encounters are updated
  - to start, run `pnpm turbo run dev --filter=worker-ranking`
- `Sync`: Syncs all encounter, competition and tournament data to and from `Toernooi.nl`
  - to start, run `pnpm turbo run dev --filter=worker-sync` (or `pnpm start:server` for API + sync together)

⚠️ Booting a worker locally makes it a consumer of the **shared dev Redis queue** — it will immediately process any jobs already sitting there, including jobs with external side effects (see Linear BAD-259). Check your env flags (`ENTER_SCORES_ENABLED`, `VR_*`) before starting workers.

Note: These workers heavily rely on the toernooi.nl system, and utilize the `VR_API_USER` and `VR_API_PASS` env variables. These variables should be available by request to the PandaPanda team. Be careful though: if the sync worker has actual credentials, there is the potential that "production" data on the toernooi.nl website will be affected. Refer to PandaPanda's documentation on the badman workers to understand what things can be affected, and the standard sync schedule for each worker before running them with true credentials. Otherwise, add `Test` as the value of each variable to ensure data does not get updated.

### 10. Testing

This is a Turborepo + pnpm monorepo using Jest. Each app/package has its own `jest.config.ts`; the shared base lives in the root `jest.preset.js`.

#### Run Tests

- `pnpm turbo run test --filter=<pkg>` — run tests for one package (e.g. `--filter=worker-sync` or `--filter=@badman/backend-graphql`)
- `pnpm test:affected` — run tests for packages affected by recent changes
- `pnpm test` — run the whole suite (turbo caches unchanged packages; add `--force` to re-execute everything)

#### Run Tests with Coverage

- `pnpm test:coverage:all` — full coverage report (lcov + text under root `./coverage`)
- `pnpm turbo run test --filter=<pkg> -- --coverage` — coverage for one package

#### Integration tests (opt-in, not run by CI)

Files named `*.integration.spec.ts` are **skipped by default** and only execute when explicitly opted in:

- `RUN_INTEGRATION_TESTS=1` gates infrastructure-heavy suites. Example: the Bull queue suite (`apps/worker/sync/src/app/queue/__tests__/queue.integration.spec.ts`) boots `redis-memory-server`, which **downloads and compiles Redis from source on first run** (minutes; cached afterwards) — exactly why it isn't part of the CI gate.

  ```bash
  cd apps/worker/sync && RUN_INTEGRATION_TESTS=1 pnpm exec jest queue.integration
  ```

- Suites that hit external APIs gate on credentials instead: the Visual/VR suite (`packages/backend-visual/src/__integration__/`) only runs when `VR_API_USER`/`VR_API_PASS` are set.

```bash
# Examples
pnpm turbo run test --filter=worker-sync        # one package
pnpm test:affected                              # affected only
pnpm test:coverage:all                          # everything, with coverage
```

**Coverage Reports**: generated in `./coverage` when running with `--coverage`.

## CI / GitHub Actions

Workflows live in [`.github/workflows/`](.github/workflows/). See [AGENTS.md → CI / GitHub Actions](./AGENTS.md#ci--github-actions) for the per-workflow rules.

| Workflow                 | Trigger                    | Purpose                                                                                                |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pull-request.yml`       | PR + merge queue           | `pnpm turbo run lint test --affected` on the PR base. Build excluded — runs in deploy.                 |
| `deploy-staging.yml`     | push to `staging`          | Full-graph lint/test/build (turbo cache) → migrate staging DB → deploy via Render hooks.               |
| `deploy-production.yml`  | push to `main`             | Full-graph lint/test/build → migrate prod DB → deploy → verify live version.                           |
| `release-please.yml`     | push to `main`             | Commit-driven release PR; merging it bumps versions, tags `vX.Y.Z`, writes CHANGELOG.                  |
| `_shared-migrate.yml`    | reusable (`workflow_call`) | Applies pending Sequelize migrations. Production requires manual approval. Concurrency-locked per env. |
| `claude-code-review.yml` | PR → `main`                | Automatic Claude review.                                                                               |
| `claude.yml`             | `@claude` mention          | On-demand Claude agent.                                                                                |
| `cla.yaml`               | External-contributor PRs   | CLA gate.                                                                                              |

**Branching → workflow mapping**: `develop`-based PRs run `pull-request.yml` only. Merging to `staging` deploys staging. Merging to `main` deploys production. Do not push directly to `staging` or `main` — use PRs.

## Legacy readme content

everything below this should be further reviewed, and edited or removed

### Debugging

Add the following to your `launch.json`

```json
{
  "name": "Server",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}/code",
  "remoteRoot": "/usr/src",
  "restart": true
}
```

for debugging the workers use following ports:

- worker-sync: 9230
- worker-ranking: 9231

### speedtest

https://github.com/rakyll/hey
`hey -n 256 -c 8 -z 30s http://localhost:5001/api/v1/ > results.txt`
