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

### Via npm scripts (recommended)

```bash
# Run main test data seeder
npm run seed:test-data

# Run admin user seeder only
npm run seed:admin

# Undo main test data seeder
npm run seed:test-data:undo

# Undo admin user seeder only
npm run seed:admin:undo

# Run all seeders in order
npm run seed:all

# Undo all seeders
npm run seed:undo:all
```

The `seed:build-utils` step is included automatically in `seed:test-data` and `seed:admin` to compile TypeScript utilities.

### Against a specific environment via Sequelize CLI

```bash
# Build TypeScript utilities (required before running seeders)
NODE_ENV=staging npm run seed:build-utils

# Run main test data seeder
NODE_ENV=staging npx sequelize-cli db:seed --seed 20250101000000-seed-test-data.js

# Run admin user seeder
NODE_ENV=staging npx sequelize-cli db:seed --seed 20250101000001-seed-admin-user.js

# Run all seeders
NODE_ENV=staging npx sequelize-cli db:seed:all

# Undo main test data seeder
NODE_ENV=staging npx sequelize-cli db:seed:undo --seed 20250101000000-seed-test-data.js

# Undo admin user seeder
NODE_ENV=staging npx sequelize-cli db:seed:undo --seed 20250101000001-seed-admin-user.js

# Undo all seeders (in reverse order)
NODE_ENV=staging npx sequelize-cli db:seed:undo:all
```

**Important notes:**
- All commands must be run from the **repo root** (where `.sequelizerc` lives)
- Building utilities is automatic with npm scripts, but required when using Sequelize CLI directly
- When undoing individual seeders, include the `--seed` flag with the specific seeder file

### Seeder execution order

1. `20250101000000-seed-test-data.js` — Creates clubs, teams, locations, and test encounters
2. `20250101000001-seed-admin-user.js` — Creates admin user with global claims

The admin seeder is **independent** and can run before or after the test-data seeder. It does not depend on clubs or teams existing.

## Undo/Cleanup behavior

Both seeders include comprehensive `down` functions that clean up **all** seeded data. ✅ **Verified to completely remove all records.**

**20250101000000-seed-test-data.js down:**
- Deletes encounters, draws, sub-events, and events (filtered by `TEST-%` visualCode)
- Deletes team memberships and teams for both clubs
- Deletes location availabilities and locations for both clubs
- Deletes club memberships and both test clubs (TEAM AWESOME, THE OPPONENTS)
- Deletes all seeded player claim memberships, ranking data (points, places, last places), and player records
- Uses club names ('TEAM AWESOME', 'THE OPPONENTS') and email addresses for safe identification

**20250101000001-seed-admin-user.js down:**
- Deletes admin player's claim memberships (all global claims)
- Deletes admin player's ranking data (points, places, last places)
- Deletes the admin player record
- Uses email address for safe identification (environment variable `SEED_ADMIN_USER_EMAIL`)

**Error handling:**
Both seeders use safe deletion with detailed logging. They handle errors gracefully (e.g., if data was already deleted or has dependencies) and continue with cleanup rather than failing completely.

## Seeder-specific environment variables

### 20250101000000-seed-test-data.js

Controls which players, clubs, and teams are created. Set in your `.env.{NODE_ENV}` file or inline:

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

This seeder creates:
- 2 clubs: "TEAM AWESOME" (Antwerpen) and "THE OPPONENTS" (Gent)
- Players in each club with 8-player teams per type (M, F, MX)
- **2 locations per club** with realistic availability schedules:
  - TEAM AWESOME: Sporthal De Bres, Sportcentrum Lillo
  - THE OPPONENTS: Sporthal Lange Munte, Sportpark Bourgoyen
- Availability periods with court counts (Tue/Thu/Sat for TEAM AWESOME, Mon/Wed/Sun for THE OPPONENTS)
- Christmas/New Year exceptions (Dec 24 – Jan 2) with 0 courts available
- 10 encounters (matches) between clubs with historical rankings

### 20250101000001-seed-admin-user.js

Creates a global admin user independent of clubs. Set in your `.env.{NODE_ENV}` file or inline:

| Variable | Description |
|---|---|
| `SEED_ADMIN_USER_EMAIL` | Email of the admin user |
| `SEED_ADMIN_FIRST_NAME` | First name of the admin user |
| `SEED_ADMIN_LAST_NAME` | Last name of the admin user |
| `SEED_ADMIN_GENDER` | Gender (`M` or `F`) of the admin user |
| `SEED_ADMIN_MEMBER_ID` | Member ID of the admin user |
| `SEED_ADMIN_USER_AUTH0_SUB` | Auth0 subject ID (`auth0|\|...`) for the admin user |

This seeder creates:
- 1 global admin player with **all global claims** (no club membership required)
- Can be run independently via `npm run seed:admin` without test-data existing

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
    ├── 20250101000000-seed-test-data.js  # Main test data seeder (clubs, players, teams, locations)
    ├── 20250101000001-seed-admin-user.js # Admin user seeder (independent, global claims only)
    └── utils/             # Shared utilities imported by seeders (TypeScript)
        ├── index.ts       # Main exports
        ├── types.ts       # Type definitions (Player, Club, Team, Location, Availability, etc.)
        ├── seeder-context.ts  # SeederContext class for consistent DB access
        ├── entity-builders.ts # Builders for creating entities (players, clubs, locations, availability)
        ├── error-handler.ts   # Error handling utilities
        ├── player-factory.ts  # PlayerFactory for batch player creation
        ├── ranking-builders.ts # Builders for rankings
        ├── data-factory.ts    # DataFactory for generating test data
        ├── membership-helpers.ts # Club membership utilities
        ├── club-team-naming.ts   # Club and team naming utilities
        ├── tsconfig.json  # TypeScript config
        └── dist/          # Compiled JS output (required by .js seeders)
            └── *.js       # Compiled output from TypeScript files
```

## Utilities API

The TypeScript utilities in `utils/` are compiled to JavaScript in `dist/` and imported by seeders. Key builders include:

### Entity Builders (entity-builders.ts)

- `findOrCreatePlayer(ctx, email, firstName, lastName, memberId, gender, auth0Sub)` — Find or create a player
- `createClub(ctx, name)` — Create a club
- `addPlayerToClub(ctx, clubId, playerId, role)` — Add player to club
- `createTeam(ctx, clubId, season, captainId, teamType?, teamNumber?)` — Create a team (idempotent; default `teamNumber` 1)
- `addPlayerToTeam(ctx, teamId, playerId)` — Add player to team
- `createEventCompetition(ctx, season, name)` — Create an event
- `createSubEventCompetition(ctx, eventId, name, teamType)` — Create a sub-event
- `createDrawCompetition(ctx, subEventId, name)` — Create a draw
- `createOpponentTeam(ctx, clubId, season, captainId, teamType?, teamNumber?)` — Create opponent team (always inserts; same args as `createTeam`)
- `createEncounters(ctx, drawId, homeTeamId, awayTeamId, count)` — Create matches
- **`createLocation(ctx, clubId, locationData)`** — Create a club location (NEW)
- **`createAvailability(ctx, locationId, availabilityData)`** — Create location availability (NEW)

### Ranking Builders (ranking-builders.ts)

- `findOrGetPrimaryRankingSystem(ctx)` — Get or create primary ranking system
- `createRankingPlace(ctx, systemId, rankingDate, playerId, place, points)` — Create a ranking place
- `createRankingLastPlace(ctx, systemId, playerId, place)` — Create last ranking for a player
- `addRankingToPlayer(ctx, playerId, email)` — Add ranking history to a player

### Factories

- `DataFactory` — Static methods for generating test data (names, emails, season calculations)
- `PlayerFactory` — Create one or multiple players from config objects

### Other Utilities

- `SeederContext` — Context wrapper for consistent sequelize/transaction/QueryTypes access
- `hasActiveMembership(ctx, playerId, clubId)` — Check club membership
- `getClubById(ctx, clubId)` — Get club details
- `generateTeamName(prefix, season, teamType)` — Generate team names
- `handleSeederError(error, operation)` — Standardized error logging
- `withErrorHandling(fn, operation)` — Wrap async functions with error handling
