# Database Seeders

Sequelize CLI seeders for populating the database with test data.

## Environment Resolution

Seeders load environment variables from two files in order of priority:

1. `.env.{NODE_ENV}` — environment-specific file (e.g. `.env.staging`) — **takes priority**
2. `.env` — base fallback file

This means values in `.env.{NODE_ENV}` override anything in `.env`.

### Available env files (repo root)

| File | Purpose |
|---|---|
| `.env` | Local development defaults |
| `.env.staging` | Staging database (Render/Frankfurt) |
| `.env.test` | Test environment |
| `.env.prod-db` | Production database credentials |

## Running seeders

### Against a specific environment

```bash
NODE_ENV=staging npx sequelize-cli db:seed --seed 20250101000000-seed-test-data.js
```

```bash
NODE_ENV=production npx sequelize-cli db:seed --seed 20250101000000-seed-test-data.js
```

### Run all seeders

```bash
NODE_ENV=staging npx sequelize-cli db:seed:all
```

### Undo seeders

```bash
# Undo the last seeder
NODE_ENV=staging npx sequelize-cli db:seed:undo

# Undo all seeders
NODE_ENV=staging npx sequelize-cli db:seed:undo:all
```

All commands must be run from the **repo root** (where `.sequelizerc` lives).

## Seeder-specific environment variables

The `20250101000000-seed-test-data.js` seeder uses these variables to control which players are created. Set them in your `.env.{NODE_ENV}` file or inline:

| Variable | Description |
|---|---|
| `SEED_HOMETEAM_USER_EMAIL` | Email of the home team player |
| `SEED_HOMETEAM_FIRST_NAME` | First name of the home team player |
| `SEED_HOMETEAM_LAST_NAME` | Last name of the home team player |
| `SEED_HOMETEAM_GENDER` | Gender (`M` or `F`) of the home team player |
| `SEED_HOMETEAM_USER_AUTH0_SUB` | Auth0 subject ID (`auth0|\|...`) for the home team player |
| `SEED_AWAYTEAM_USER_EMAIL` | Email of the away team player |
| `SEED_AWAYTEAM_FIRST_NAME` | First name of the away team player |
| `SEED_AWAYTEAM_LAST_NAME` | Last name of the away team player |
| `SEED_AWAYTEAM_GENDER` | Gender (`M` or `F`) of the away team player |
| `SEED_AWAYTEAM_USER_AUTH0_SUB` | Auth0 subject ID (`auth0|\|...`) for the away team player |

## Database connection variables

These are read by `database/config/config.js` and must be present in the resolved env file:

| Variable | Description |
|---|---|
| `DB_IP` | Database host |
| `DB_PORT` | Database port (usually `5432`) |
| `DB_DATABASE` | Database name |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_DIALECT` | Sequelize dialect (`postgres`) |
| `DB_SSL` | Use SSL (`true` / `false`) |

## How env loading works (for LLMs)

Both the seeder file and the config file call `dotenv.config()` twice:

```js
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${env}` }); // env-specific, takes priority
require('dotenv').config({ path: `.env` });          // base fallback
```

`dotenv` does not overwrite already-set variables, so the first call wins for any key that appears in both files.

The `NODE_ENV` variable itself must be set **before** the process starts (via the CLI prefix `NODE_ENV=staging ...`) because it is read before `dotenv` loads.

## File structure

```
database/
├── config/
│   └── config.js          # Sequelize connection config — reads DB_* env vars
├── migrations/            # Schema migrations (run with db:migrate)
└── seeders/
    ├── README.md           # This file
    ├── SEEDER_EXTENSION_PLAN.md  # Architecture plan for the utils layer
    ├── 20250101000000-seed-test-data.js  # Main test data seeder
    └── utils/             # Shared utilities imported by seeders
        ├── index.ts
        ├── seeder-context.ts
        ├── entity-builders.ts
        ├── data-factory.ts
        ├── player-factory.ts
        ├── ranking-builders.ts
        ├── membership-helpers.ts
        ├── error-handler.ts
        ├── types.ts
        └── dist/          # Compiled JS output (required by the .js seeder)
```
