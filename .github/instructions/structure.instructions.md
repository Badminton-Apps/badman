---
applyTo: '**'
---

# GitHub Copilot Instructions for Badman Project

## Project Overview
Badman is a comprehensive badminton management system built with Angular 19, Node.js, and TypeScript using Nx monorepo architecture. The application handles player management, tournament organization, ranking systems, and club administration.

## Architecture & Technologies
- **Monorepo**: Nx workspace with advanced dependency management
- **Frontend**: Angular 19 with Material Design, PWA capabilities
- **Backend**: Node.js with GraphQL API
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **Testing**: Jest (unit), Playwright (E2E)
- **Build Tools**: Webpack, Angular CLI

## Key Directory Structure

### Applications (`apps/`)
- `apps/badman/` - Main Angular frontend (serves at localhost:3000)
- `apps/api/` - GraphQL API server and business logic
- `apps/worker/` - Background workers for sync, ranking, and regional processing
- `apps/scripts/` - Development and deployment scripts
- `apps/*-e2e/` - End-to-end test suites (desktop, mobile, shared base)

### Libraries (`libs/`)
**Backend Libraries** (`libs/backend/`):
- Core: `authorization/`, `database/`, `graphql/`, `cache/`, `queue/`
- Business: `competition/`, `ranking/`, `notifications/`, `mailing/`
- Integrations: `twizzit/`, `belgium/flanders/`
- Utils: `search/`, `translate/`, `visual/`, `validation/`, `websockets/`

**Frontend Libraries** (`libs/frontend/`):
- Core: `models/`, `graphql/`, `auth/`, `components/`, `utils/`
- Pages: `club/`, `player/`, `team/`, `ranking/`, `tournament/`, `competition/`
- Services: `seo/`, `translation/`, `pdf/`, `excel/`, `notifications/`, `queue/`

**Shared**: `libs/utils/` - Cross-platform utilities

### Other Important Directories
- `database/` - Migrations, config, scripts
- `mails/` - HTML email templates
- `scripts/` - Build and deployment scripts
- `types/` - Global TypeScript definitions

## Development Guidelines

### File Creation Patterns
- **Angular Components**: Place in appropriate feature library under `libs/frontend/`
- **Backend Services**: Place in relevant domain library under `libs/backend/`
- **Shared Models**: Use `libs/frontend/models/` or `libs/utils/`
- **GraphQL**: Schema in `libs/backend/graphql/`, queries in `libs/frontend/graphql/`
- **Tests**: Co-locate with source files or in `apps/*-e2e/` for E2E tests

### Naming Conventions
- Libraries follow domain-driven design (e.g., `competition`, `ranking`, `player`)
- Angular components use kebab-case with feature prefix
- Backend services use PascalCase
- Database models follow Sequelize conventions

### Import Patterns
- Use Nx library imports: `@badman/frontend-models`, `@badman/backend-database`
- Prefer barrel exports from library index files
- GraphQL imports typically from `@badman/frontend-graphql`

### Common File Types
- `.component.ts/.html/.scss` - Angular components
- `.service.ts` - Angular/Node.js services  
- `.resolver.ts` - GraphQL resolvers
- `.model.ts` - Database models (Sequelize)
- `.interface.ts` - TypeScript interfaces
- `.spec.ts` - Jest unit tests
- `.e2e-spec.ts` - Playwright E2E tests

### Key Configuration Files
- `nx.json` - Nx workspace config
- `project.json` - Per-app/library configuration
- `tsconfig.*.json` - TypeScript configs
- `jest.config.ts` - Test configuration
- `schema.gql` - GraphQL schema

When suggesting code changes, consider the modular architecture and ensure proper separation between frontend/backend concerns. Follow Nx best practices for library boundaries and dependency management.

## Fetching data
Use the graphql tool to fetch data from the GraphQL API,
Always try to use the existing data structures and types defined in the project.

Only create new resolvers if we are changing the models