# Badman Project Structure

Welcome to the Badman project! This document provides an overview of the project structure, architecture, and essential files to help new contributors get started quickly.

## 🏗️ Overview

Badman is a comprehensive badminton management system built with Angular, Node.js, and TypeScript using the Nx monorepo architecture. The application handles everything from player management and tournament organization to ranking systems and club administration.

## 🎯 Key Technologies

- **Frontend**: Angular 19 with Material Design
- **Backend**: Node.js with GraphQL API
- **Database**: PostgreSQL with Sequelize ORM
- **Monorepo**: Nx workspace with advanced dependency management
- **Cache**: Redis
- **Testing**: Jest, Playwright (E2E)
- **Build**: Webpack, Angular CLI

## 📁 Project Structure

### 🚀 Applications (`apps/`)

#### Main Applications

- **`apps/badman/`** - Primary Angular frontend application

  - The main web client for badminton management
  - Material Design UI with PWA capabilities
  - Serves at `http://localhost:3000` in development
  - Tags: `type:app`, `scope:client`

- **`apps/api/`** - GraphQL API server
  - Node.js backend with GraphQL endpoint
  - Handles all business logic and data operations
  - Integrates with external badminton federation APIs
  - Serves the main API for the frontend

#### Worker Applications

- **`apps/worker/sync/`** - Data synchronization worker

  - Syncs data with external badminton federation systems
  - Handles background data processing tasks

- **`apps/worker/ranking/`** - Ranking calculation worker

  - Processes player and team rankings
  - Handles complex ranking algorithms

- **`apps/worker/belgium/flanders/`** - Regional workers
  - **`places/`** - Manages venue and location data for Flanders region
  - **`points/`** - Calculates region-specific point systems

#### Development & Testing

- **`apps/scripts/`** - Development and deployment scripts
- **`apps/badman-e2e/`** - End-to-end test suite (shared base)
- **`apps/badman-e2e-desktop/`** - Desktop-specific E2E tests
- **`apps/badman-e2e-mobile/`** - Mobile-specific E2E tests

### 📚 Libraries (`libs/`)

The project follows a modular architecture with separate backend and frontend libraries:

#### Backend Libraries (`libs/backend/`)

- **Core Services**:

  - `authorization/` - Authentication and permission management
  - `database/` - Database models and ORM configuration
  - `graphql/` - GraphQL schema and resolvers
  - `cache/` - Redis caching layer
  - `queue/` - Background job processing

- **Business Logic**:

  - `competition/` - Tournament and competition management
    - `assembly/` - Team assembly logic
    - `change-encounter/` - Match change handling
    - `enrollment/` - Competition enrollment
    - `transfer-loans/` - Player transfers and loans
  - `ranking/` - Player and team ranking systems
  - `notifications/` - Email and push notifications
  - `mailing/` - Email template and sending

- **External Integrations**:

  - `twizzit/` - Integration with Twizzit tournament software
  - `belgium/flanders/` - Belgian Flanders federation integration
    - `games/` - Game data processing
    - `places/` - Venue management
    - `points/` - Point system calculations

- **Utilities**:
  - `search/` - Search functionality
  - `translate/` - Internationalization
  - `visual/` - Chart and visualization generation
  - `validation/` - Data validation rules
  - `websockets/` - Real-time communication

#### Frontend Libraries (`libs/frontend/`)

- **Core Modules**:

  - `models/` - TypeScript interfaces and data models
  - `graphql/` - GraphQL client and queries
  - `auth/` - Authentication services
  - `components/` - Reusable UI components
  - `utils/` - Utility functions

- **Feature Pages**:

  - `club/` - Club management interface
  - `player/` - Player profiles and management
  - `team/` - Team management
  - `ranking/` - Ranking displays and management
  - `tournament/` - Tournament organization
  - `competition/` - Competition-specific features
    - `event/` - Event management
    - `team-assembly/` - Team formation tools
    - `team-enrollment/` - Team registration
    - `change-encounter/` - Match change requests

- **Services & Modules**:
  - `seo/` - Search engine optimization
  - `translation/` - Multi-language support
  - `pdf/` - PDF generation
  - `excel/` - Excel export functionality
  - `notifications/` - In-app notifications
  - `queue/` - Background task management

#### Shared Libraries

- **`libs/utils/`** - Shared utility functions used across backend and frontend

### 🗄️ Additional Directories

- **`database/`** - Database configuration and migrations

  - `migrations/` - Sequelize database migrations
  - `config/` - Database connection configurations
  - `scripts/` - Database utility scripts

- **`scripts/`** - Build and deployment scripts
- **`mails/`** - Email templates (HTML)
- **`files/`** - Static files and uploads
- **`coverage/`** - Test coverage reports
- **`tmp/`** - Temporary build files
- **`types/`** - Global TypeScript type definitions

## 📖 Key Files for New Contributors

### Configuration Files

- **`nx.json`** - Nx workspace configuration
- **`package.json`** - Dependencies and scripts
- **`tsconfig.base.json`** - TypeScript base configuration
- **`jest.config.ts`** - Testing configuration
- **`docker-compose.dev.yml`** - Development environment setup

### Documentation

- **`README.md`** - Basic setup and development guide
- **`CONTRIBUTING.md`** - Contribution guidelines and workflow
- **`CODE_OF_CONDUCT.md`** - Community guidelines
- **`LICENSE.md`** - Project license

### Development Helpers

- **`proxy.conf.json`** - Development proxy configuration
- **`migrations.json`** - Database migration tracking
- **`schema.gql`** - GraphQL schema definition
