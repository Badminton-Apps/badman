---
applyTo: "**"
---

# GitHub Copilot Instructions for Badman Project

`AGENTS.md` in the repository root is the single source of truth for AI-assisted development in this repo. This file is a short orientation; when the two disagree, `AGENTS.md` wins.

## Project Overview

Badman is a comprehensive badminton management system built with NestJS and TypeScript in a Turborepo monorepo. The application handles player management, tournament organization, ranking systems, and club administration.

This repository is **backend-only** — the frontend lives in a separate repository. Do not add frontend code here.

## Architecture & Technologies

- **Monorepo**: Turborepo over pnpm workspaces
- **Backend**: NestJS with a code-first Apollo GraphQL API (Fastify adapter)
- **Database**: PostgreSQL with Sequelize ORM (`sequelize-typescript`)
- **Queues**: Bull on Redis
- **Cache**: Redis
- **Testing**: Jest, per-package config with a shared `jest.preset.js`
- **Build Tools**: `nest build` for apps, `tsc` for packages

## Key Directory Structure

### Applications (`apps/`)

- `apps/api/` - GraphQL API server and business logic (serves at localhost:5010)
- `apps/worker/sync/` - Federation data sync worker
- `apps/worker/ranking/` - Ranking recalculation worker
- `apps/worker/belgium/flanders/{places,points}/` - Regional workers
- `apps/scripts/` - One-off operational scripts

### Packages (`packages/`)

Compiled internal libraries. `tsc` emits to `<pkg>/dist` and consumers resolve through the package `exports` map.

- Core: `backend-authorization/`, `backend-database/`, `backend-graphql/`, `backend-cache/`, `backend-queue/`
- Business: `backend-competition/{assembly,change-encounter,encounter-games,enrollment,transfer-loans}/`, `backend-ranking/`, `backend-notifications/`, `backend-mailing/`
- Integrations: `backend-twizzit/`, `backend-visual/`, `backend-belgium/flanders/{games,places,points}/`
- Utils: `utils/`, `backend-utils/`, `backend-search/`, `backend-translate/`, `backend-validation/`, `backend-websockets/`

### Other Important Directories

- `database/` - Migrations, config, seeders
- `mails/` - HTML email templates
- `scripts/` - Build and deployment scripts
- `specs/` - Feature specifications
- `types/` - Global TypeScript definitions

## Development Guidelines

### File Creation Patterns

- **Backend Services**: Place in the relevant domain package under `packages/`
- **Resolvers**: `packages/backend-graphql/src/resolvers/<domain>/` — one `*.resolver.ts`, `*.module.ts`, `*.resolver.spec.ts` per domain
- **Models**: `packages/backend-database/` — Sequelize models double as GraphQL `@ObjectType` declarations
- **Shared enums and helpers**: `packages/utils/`
- **Tests**: Co-locate with source files (`foo.resolver.ts` → `foo.resolver.spec.ts`)

### Naming Conventions

- Packages follow domain-driven design (e.g., `competition`, `ranking`, `enrollment`)
- Backend services use PascalCase
- Database models follow Sequelize conventions

### Import Patterns

- Import packages by their alias: `@badman/backend-database`, `@badman/utils`
- To add a dependency between packages, add `"@badman/<name>": "workspace:*"` to the consumer's `package.json` and run `pnpm install`. There are **no tsconfig path aliases** — resolution goes through each package's `exports` map
- The alias is the package's `name` field and does not always match its directory (`packages/backend-competition/assembly` is `@badman/backend-assembly`) — check the `package.json`
- Prefer barrel exports from a package's index file

### Common File Types

- `.service.ts` - NestJS services
- `.resolver.ts` - GraphQL resolvers
- `.model.ts` - Database models (Sequelize)
- `.interface.ts` - TypeScript interfaces
- `.spec.ts` - Jest unit tests
- `.integration.spec.ts` - Integration tests (opt-in, skipped by default)

### Key Configuration Files

- `turbo.json` - Task pipeline, caching and task dependencies
- `pnpm-workspace.yaml` - Which directories are workspace packages
- Each app/package `package.json` - Its own scripts and `workspace:*` dependencies
- `tsconfig.*.json` - TypeScript configs
- `jest.preset.js` + per-package `jest.config.ts` - Test configuration
- `schema.gql` - GraphQL schema

### Common Commands

- `pnpm turbo run build --filter=<name>` - Build one app or package
- `pnpm turbo run test --filter=<name>` - Test one package
- `pnpm start:server` - Serve the API and sync worker in watch mode

When suggesting code changes, respect the package boundaries and express cross-package dependencies through `workspace:*` rather than reaching into another package's source.

## Fetching data

Use the graphql tool to fetch data from the GraphQL API,
Always try to use the existing data structures and types defined in the project.

Only create new resolvers if we are changing the models
