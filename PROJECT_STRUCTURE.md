# Badman Project Structure

Welcome to the Badman project! This document provides an overview of the project structure, architecture, and essential files to help new contributors get started quickly.

## 🏗️ Overview

Badman is a comprehensive badminton management system built with Node.js and TypeScript in a Turborepo monorepo. The application handles everything from player management and tournament organization to ranking systems and club administration.

This repository is **backend-only** — the frontend lives in a separate repository (Constitution v2.0.0, Principle V). Do not reintroduce frontend code here.

## 🎯 Key Technologies

- **Backend**: NestJS with a code-first Apollo GraphQL API
- **Database**: PostgreSQL with Sequelize ORM (`sequelize-typescript`)
- **Monorepo**: Turborepo over pnpm workspaces
- **Queues**: Bull on Redis
- **Cache**: Redis
- **Testing**: Jest (per-package config, shared `jest.preset.js`)
- **Build**: `nest build` for apps, `tsc` for packages

## 📁 Project Structure

### 🚀 Applications (`apps/`)

Deployable NestJS apps. Each builds into its own `dist/` and declares its runtime dependencies in its own `package.json` (internal ones as `workspace:*`). The name in the table is the turbo filter, e.g. `pnpm turbo run build --filter=api`.

#### Main Applications

- **`apps/api/`** (`api`) — GraphQL API server
  - NestJS on the Fastify adapter, serving at `http://localhost:5010` in development
  - Handles all business logic and data operations
  - Integrates with external badminton federation APIs

#### Worker Applications

- **`apps/worker/sync/`** (`worker-sync`) — Data synchronization worker

  - Syncs data with external badminton federation systems
  - Handles background data processing tasks

- **`apps/worker/ranking/`** (`worker-ranking`) — Ranking calculation worker

  - Processes player and team rankings
  - Handles complex ranking algorithms

- **`apps/worker/belgium/flanders/`** — Regional workers
  - **`places/`** (`worker-belgium-flanders-places`) — Manages venue and location data for the Flanders region
  - **`points/`** (`worker-belgium-flanders-points`) — Calculates region-specific point systems

#### Development & Testing

- **`apps/scripts/`** (`scripts`) — One-off operational scripts

### 📚 Packages (`packages/`)

Shared code lives in **compiled internal packages**: `tsc` emits to `<pkg>/dist` and consumers resolve through the package `exports` map. There are no tsconfig path aliases — to depend on a package, add `"@badman/<name>": "workspace:*"` to the consumer's `package.json` and run `pnpm install`.

The import alias is the package's `name` field and **does not always match its directory** — always check the `package.json`.

#### Core Services

| Directory                         | Import alias                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| `packages/backend-authorization/` | `@badman/backend-authorization` — JWT/Auth0 guard, `@User()` decorator |
| `packages/backend-database/`      | `@badman/backend-database` — all Sequelize models + `DatabaseModule`   |
| `packages/backend-graphql/`       | `@badman/backend-graphql` — all resolvers, scalars, query utilities    |
| `packages/backend-cache/`         | `@badman/backend-cache` — Redis caching layer                          |
| `packages/backend-queue/`         | `@badman/backend-queue` — Bull queue setup and queue name constants    |
| `packages/backend-cluster/`       | `@badman/backend-cluster`                                              |
| `packages/backend-orchestrator/`  | `@badman/backend-orchestrator`                                         |
| `packages/backend-micro/`         | `@badman/backend-micro`                                                |
| `packages/backend-health/`        | `@badman/backend-health`                                               |
| `packages/backend-logging/`       | `@badman/backend-logging`                                              |

#### Business Logic

| Directory                                        | Import alias                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/backend-competition/assembly/`         | `@badman/backend-assembly` — team assembly logic                 |
| `packages/backend-competition/change-encounter/` | `@badman/backend-change-encounter` — match change handling       |
| `packages/backend-competition/encounter-games/`  | `@badman/backend-encounter-games`                                |
| `packages/backend-competition/enrollment/`       | `@badman/backend-enrollment` — enrollment validation rule engine |
| `packages/backend-competition/transfer-loans/`   | `@badman/backend-transfer-loan` — player transfers and loans     |
| `packages/backend-ranking/`                      | `@badman/backend-ranking` — ranking calculation services         |
| `packages/backend-notifications/`                | `@badman/backend-notifications` — email and push notifications   |
| `packages/backend-mailing/`                      | `@badman/backend-mailing` — email templating and sending         |

#### External Integrations

| Directory                                   | Import alias                                            |
| ------------------------------------------- | ------------------------------------------------------- |
| `packages/backend-twizzit/`                 | `@badman/backend-twizzit` — Twizzit tournament software |
| `packages/backend-visual/`                  | `@badman/backend-visual` — VR/Visual federation API     |
| `packages/backend-belgium/flanders/games/`  | `@badman/belgium-flanders-games`                        |
| `packages/backend-belgium/flanders/places/` | `@badman/belgium-flanders-places`                       |
| `packages/backend-belgium/flanders/points/` | `@badman/belgium-flanders-points`                       |

#### Utilities

| Directory                      | Import alias                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `packages/utils/`              | `@badman/utils` — business helpers, enums, config schema, `i18n.generated.ts` |
| `packages/backend-utils/`      | `@badman/backend-utils`                                                       |
| `packages/backend-search/`     | `@badman/backend-search` — search functionality                               |
| `packages/backend-translate/`  | `@badman/backend-translate` — `nestjs-i18n` module + i18n JSON assets         |
| `packages/backend-validation/` | `@badman/backend-validation` — data validation rules                          |
| `packages/backend-websockets/` | `@badman/backend-websockets` — real-time communication                        |
| `packages/backend-compile/`    | `@badman/backend-compile`                                                     |
| `packages/backend-generator/`  | `@badman/backend-generator` — `.cp` file generation                           |
| `packages/backend-pupeteer/`   | `@badman/backend-pupeteer` — headless browser helpers                         |

### 🗄️ Additional Directories

- **`database/`** — Database configuration and migrations
  - `migrations/` — Sequelize database migrations
  - `config/` — Database connection configurations
  - `seeders/` — Seed data
- **`scripts/`** — Build and deployment scripts
- **`specs/`** — Feature specifications (Spec Kit)
- **`docs/`** — Long-form internal documentation
- **`mails/`** — Email templates (HTML)
- **`coverage/`** — Test coverage reports
- **`types/`** — Global TypeScript type definitions

## 📖 Key Files for New Contributors

### Configuration Files

- **`turbo.json`** — Turborepo task pipeline, caching and task dependencies
- **`pnpm-workspace.yaml`** — Which directories are workspace packages
- **`package.json`** — Root dependencies and the `turbo run …` scripts
- **`tsconfig.base.json`** — TypeScript base configuration
- **`jest.preset.js`** — Shared Jest preset consumed by each package's `jest.config.ts`
- **`.sequelizerc`** — Points `sequelize-cli` at `database/config/config.js`
- **`docker-compose.dev.yml`** — Development environment setup (PostgreSQL, Redis, pgAdmin)

### Documentation

- **`AGENTS.md`** (symlinked as `CLAUDE.md`) — Single source of truth for AI-assisted development
- **`README.md`** — Basic setup and development guide
- **`CONTRIBUTING.md`** — Contribution guidelines and workflow
- **`CODE_OF_CONDUCT.md`** — Community guidelines
- **`LICENSE.md`** — Project license

### Development Helpers

- **`schema.gql`** — Generated GraphQL schema definition
- **`lefthook.yml`** — Pre-commit hooks (eslint, prettier)
- **`release-please-config.json`** — Commit-driven release configuration
