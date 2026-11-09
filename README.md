# Badman

Backend for Badman, the competition platform of Badminton Vlaanderen: a NestJS GraphQL API plus Bull queue workers, in a Turborepo + pnpm monorepo with PostgreSQL (PostGIS) and Redis.

The frontend lives in a separate repository, [`badman-frontend`](https://github.com/wappla/badman-frontend). Set up this backend first; the frontend needs a running API for its GraphQL types and translations.

## Local setup

### 1. Prerequisites

- **Node 22.22.3** (pinned in `.nvmrc`, `engines` and `volta`). With nvm: `nvm install && nvm use`. Volta picks it up automatically.
- **pnpm** via corepack: `corepack enable`. The version is pinned in `package.json` (`packageManager`).
- **Docker** (Docker Desktop or similar). On Apple Silicon, the Postgres image runs as `linux/amd64`, so turn on "Use Rosetta for x86/amd64 emulation" in Docker Desktop settings.

### 2. Install

```bash
corepack enable
pnpm install
```

### 3. Environment values

```bash
cp .env.example .env
```

The defaults work for local development. Fill in the two **Auth0** values (`AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`); ask a Badman team member for them.

Keep the "side effects" flags off (`ENTER_SCORES_ENABLED`, `VR_*`, `MAIL_ENABLED`, `PUSH_ENABLED`). `VR_API` points at an unreachable placeholder on purpose, so nothing talks to toernooi.nl until you deliberately configure it (see [Workers](#workers)).

The API validates `.env` at boot ([`configuration.ts`](packages/utils/src/config/configuration.ts)). An empty value such as `MAIL_HOST=` fails validation: comment out variables you don't use instead of leaving them empty.

### 4. Start Postgres and Redis

```bash
npm run docker:up
```

This starts, from [`docker-compose.dev.yml`](docker-compose.dev.yml):

| Service | Port | Notes |
| --- | --- | --- |
| Postgres 16 + PostGIS | 5432 | Database, user and password come from `DB_DATABASE` / `DB_USER` / `DB_PASSWORD` in `.env` |
| Redis 7 | 6379 | Queues and websockets |
| pgAdmin | 5050 | Login `pgadmin4@pgadmin.org` / `admin` (override with `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`) |

The database is created on the first start of the data volume. Changing the `DB_*` values afterwards doesn't change an existing volume.

### 5. Database

Pick one of two routes.

**A. Empty database with test data (no production data needed)**

```bash
npm run db:migrate        # builds the full schema from scratch
npm run seed:test-data    # 2 clubs, teams, players, locations, encounters
npm run seed:admin        # a global admin player
```

Set `SEED_*_AUTH0_SUB` in `.env` before seeding to log in as one of the seeded players (see [step 7](#7-log-in)). Seeder details: [`database/seeders/README.md`](database/seeders/README.md).

Migrations create the full production permission-claim catalog, so roles and permission checks work like in production. A database built from migrations only has no ranking system; the test-data seeder creates a primary one.

**B. Copy of the production database (realistic data)**

1. Ask a Badman team member for a recent dump and put it in `database/backup/` (git-ignored, mounted in the container at `/home/backup`).
2. Restore it into the empty database:

   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     pg_restore -U badman -d badman --no-owner --no-privileges /home/backup/<dump-file>
   ```

   For a plain `.sql` dump, use `psql -U badman -d badman -f /home/backup/<dump-file>` instead. PostGIS is already enabled in the database, so the locations table restores correctly.
3. Apply migrations that are newer than the dump: `npm run db:migrate`.

Production data contains personal data. Keep the dump on your machine and don't share it.

### 6. Start the API

```bash
pnpm start:server
```

This builds the internal packages and starts the API plus the sync worker in watch mode. The API runs on **http://localhost:5010**:

- GraphQL: http://localhost:5010/graphql
- Version check: http://localhost:5010/api/v1/version

Run `npm run db:migrate` again whenever you pull new migrations.

### 7. Log in

Badman uses Auth0. Locally, you log in with your own Auth0 account and link it to a player in your database:

1. Start [`badman-frontend`](https://github.com/wappla/badman-frontend) and sign up on its login page with your own email.
2. Find your Auth0 user id (`auth0|...`). While logged in, run this in the browser console on http://localhost:3001:

   ```js
   JSON.parse(atob((await (await fetch("/api/auth/session")).json()).access_token.split(".")[1])).sub
   ```

   It's also on your user in the Auth0 dashboard (User Management → Users).
3. Link it to a player:
   - Route A: put it in `SEED_ADMIN_USER_AUTH0_SUB` (or a `SEED_HOMETEAM_*` / `SEED_AWAYTEAM_*` sub) and run the seeder again (`npm run seed:admin:undo && npm run seed:admin`).
   - Route B: in pgAdmin, open `public."Players"`, find the player you want to log in as, and put the id in the `sub` column.

Reload the frontend: you now see the app as that player, with their clubs, teams and permissions.

### Troubleshooting

- **`... is not allowed to be empty` at boot**: a variable in `.env` is set to an empty value. Comment it out.
- **`... is required` at boot**: compare `.env` with `.env.example`; a required variable is missing.
- **Port 5432 already in use**: a locally installed Postgres is running. Stop it (e.g. `brew services stop postgresql`) or change the port mapping.
- **Postgres container won't start on Apple Silicon**: turn on Rosetta emulation in Docker Desktop (see [Prerequisites](#1-prerequisites)).
- **Database is empty after pulling a newer `docker-compose.dev.yml`**: the Postgres data volume used to be mounted at the wrong path, so the data lived in an anonymous volume. After the fix, the container starts with the named volume `badman-next_db-data`. Re-run [step 5](#5-database). If you need the old data, find the anonymous volume with `docker volume ls`, mount it in a temporary container, and dump it.
- **`Could not find sync service` in the worker log**: expected on a fresh database. The `system."Services"` rows only exist on deployed databases; without them the worker doesn't reset cron jobs, which is what you want locally.
- **Server behaviour doesn't match the code**: stop and restart `pnpm start:server`; watch mode doesn't always pick up changes in internal packages.

## Workers

Badman syncs with [Toernooi.nl](https://www.toernooi.nl), the source of truth for competitions, tournaments, clubs, teams, results and rankings.

- **Sync**: encounters, competitions and tournaments to and from toernooi.nl. Starts with `pnpm start:server`, or on its own with `pnpm turbo run dev --filter=worker-sync`.
- **Ranking**: player rankings. Start with `pnpm start:ranking` (ranking + Belgium Flanders places/points workers).

⚠️ A worker processes every job in the Redis queue it connects to. With the default `.env` that is your local docker Redis. If you point `REDIS_HOST` at a shared Redis (e.g. dev), your worker starts processing jobs that are already waiting there, including jobs with external side effects (see BAD-259).

⚠️ With real `VR_API_USER` / `VR_API_PASS` credentials, the sync worker can change data on the live toernooi.nl site. Only set real credentials when you need them, and keep `ENTER_SCORES_ENABLED`, `VR_CHANGE_DATES` and `VR_ACCEPT_ENCOUNTERS` off unless you are deliberately testing those flows.

## Testing

Jest, configured per package (`<pkg>/jest.config.ts`) with a shared base in [`jest.preset.js`](jest.preset.js).

```bash
pnpm turbo run test --filter=<pkg>   # one package, e.g. --filter=worker-sync or --filter=@badman/backend-graphql
pnpm test:affected                   # packages affected by your changes
pnpm test                            # everything (turbo caches unchanged packages; add --force to re-run)
pnpm test:coverage:all               # coverage report in ./coverage
```

**Integration tests** (`*.integration.spec.ts`) are skipped by default and never run in CI:

- `RUN_INTEGRATION_TESTS=1` enables infrastructure-heavy suites. The Bull queue suite boots `redis-memory-server`, which compiles Redis from source on its first run (takes minutes, cached afterwards):

  ```bash
  cd apps/worker/sync && RUN_INTEGRATION_TESTS=1 pnpm exec jest queue.integration
  ```

- Suites that call external APIs run only when their credentials are set, e.g. the Visual suite needs `VR_API_USER` / `VR_API_PASS`.

## Debugging

[`.vscode/launch.json`](.vscode/launch.json) has attach configurations. The quickest is **Attach by Process ID**: start `pnpm start:server`, run the configuration and pick the API process.

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
