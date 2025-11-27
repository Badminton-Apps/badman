# Sync Worker Architecture

## Overview

The Sync Worker is a NestJS-based microservice that synchronizes badminton tournament data between external systems (primarily toernooi.nl/badmintonvlaanderen.be) and the Badman database. It processes queue jobs using Bull (Redis-based queue system) and uses Puppeteer for browser automation when interacting with external websites.

## Architecture Components

### 1. Entry Point (`main.ts`)

- Initializes NestJS application with Fastify adapter
- Configures Redis WebSocket adapter for real-time communication
- Starts HTTP server on configured port (default: 5001)

### 2. Core Module (`app.module.ts`)

- Registers all processors as providers
- Imports required backend modules (Database, Queue, Visual, Mailing, etc.)
- On bootstrap: logs configuration, updates service status, resets cron jobs

### 3. Queue Processors

The worker processes jobs from the `SyncQueue` queue. Each processor handles specific job types:

#### **SyncEventsProcessor** (`Sync.SyncEvents`)

Main event synchronization processor that:

- Fetches events from Visual service (toernooi.nl API)
- Supports filtering by date, search term, event ID, or change detection
- Routes events to either `CompetitionSyncer` or `TournamentSyncer` based on event type
- Processes events in transactions with rollback on failure
- Sends notifications on completion

**Event Types:**

- **Competition Events**: Team tournaments/leagues (OnlineLeague, TeamTournament)
- **Tournament Events**: Individual tournaments

#### **EnterScoresProcessor** (`Sync.EnterScores`)

Automates score entry into toernooi.nl using Puppeteer:

- Opens browser and navigates to encounter page
- Signs in with credentials
- Enters game scores, winners, game leader, shuttle, start/end times
- Validates input and saves data
- Sends success/failure email notifications
- Uses database transactions for data consistency

#### **CheckEncounterProcessor** (`Sync.CheckEncounters`, `Sync.CheckEncounter`)

Monitors encounter status on toernooi.nl:

- Checks if scores are entered and accepted
- Detects comments on encounters
- Sends notifications for:
  - Encounters not entered after 24 hours
  - Encounters not accepted after 48 hours
  - Encounters with comments
- Auto-accepts encounters (if enabled) after 36 hours
- Updates local database with encounter metadata

#### **SyncRankingProcessor** (`Sync.SyncRanking`)

Synchronizes player ranking data from Visual service

#### **SyncTwizzitProcessor** (`Sync.SyncTwizzit`)

Synchronizes data from Twizzit system

### 4. Sync Processors

#### **CompetitionSyncer**

Step-based processor for competition events with the following pipeline:

```
1. Event → Create/update EventCompetition
2. SubEvent → Create/update SubEventCompetition
3. Ranking → Sync ranking data
4. Draw → Create/update DrawCompetition
5. Entry → Create/update team entries
6. Encounter → Create/update EncounterCompetition
7. EncounterLocation → Update encounter locations
8. Player → Sync player data
9. Game → Create/update Game records
10. Point → Calculate and update points
11. Standing → Update standings
12. Cleanup → Clean up orphaned data
```

#### **TournamentSyncer**

Step-based processor for tournament events with the following pipeline:

```
1. Event → Create/update EventTournament
2. SubEvent → Create/update SubEventTournament
3. Ranking → Sync ranking data
4. Draw → Create/update DrawTournament
5. Player → Sync player data
6. Game → Create/update Game records
7. Point → Calculate and update points
8. Standing → Update standings
```

### 5. Processing Framework

The sync uses a custom `Processor` class that executes `ProcessStep` instances sequentially:

- Each step can pass data to subsequent steps
- Steps can stop execution early
- All steps run within database transactions
- Comprehensive logging and timing

## Data Flow

### Event Sync Flow

```
Queue Job (Sync.SyncEvents)
    ↓
SyncEventsProcessor
    ↓
Fetch Events from Visual Service
    ↓
Filter & Sort Events
    ↓
For each Event:
    ├─ Competition Event? → CompetitionSyncer
    │   ├─ Event Step
    │   ├─ SubEvent Step
    │   ├─ Ranking Step
    │   ├─ Draw Step
    │   ├─ Entry Step
    │   ├─ Encounter Step
    │   ├─ EncounterLocation Step
    │   ├─ Player Step
    │   ├─ Game Step
    │   ├─ Point Step
    │   ├─ Standing Step
    │   └─ Cleanup Step
    │
    └─ Tournament Event? → TournamentSyncer
        ├─ Event Step
        ├─ SubEvent Step
        ├─ Ranking Step
        ├─ Draw Step
        ├─ Player Step
        ├─ Game Step
        ├─ Point Step
        └─ Standing Step
    ↓
Commit Transaction (or Rollback on Error)
    ↓
Send Notification
```

### Enter Scores Flow

```
Queue Job (Sync.EnterScores)
    ↓
EnterScoresProcessor
    ↓
Load Encounter from Database
    ↓
Launch Puppeteer Browser
    ↓
Navigate to Encounter Page
    ↓
Accept Cookies & Sign In
    ↓
Enter Edit Mode
    ↓
Clear Fields
    ↓
Enter Games (with Transaction)
    ├─ Select Players
    ├─ Enter Scores
    ├─ Enter Winners
    └─ Handle Unknown Players
    ↓
Enter Additional Data
    ├─ Game Leader
    ├─ Shuttle
    ├─ Start Hour
    └─ End Hour
    ↓
Validate Input
    ↓
Save (if enabled)
    ↓
Send Email Notification
    ↓
Close Browser
```

### Check Encounters Flow

```
Queue Job (Sync.CheckEncounters)
    ↓
CheckEncounterProcessor
    ↓
Find Unaccepted Encounters (last 14 days)
    ↓
Chunk into Groups of 10
    ↓
For each Chunk:
    ├─ Launch Browser
    ├─ Accept Cookies
    └─ For each Encounter:
        ├─ Navigate to Encounter Page
        ├─ Check Status (entered, accepted, comments)
        ├─ Send Notifications if needed
        ├─ Auto-accept if conditions met
        └─ Update Database
    ↓
Close Browser
```

## Key Features

### Transaction Management

- All database operations use Sequelize transactions
- Automatic rollback on errors
- Transaction manager for complex operations

### Error Handling

- Comprehensive error logging
- Email notifications on failures
- Job retry mechanism via Bull queue
- Graceful browser cleanup

### Configuration

- `VISUAL_SYNC_ENABLED`: Show browser window for debugging
- `ENTER_SCORES_ENABLED`: Allow saving scores to production
- `VR_ACCEPT_ENCOUNTERS`: Auto-accept encounters
- `VR_CHANGE_DATES`: Allow date changes
- `DEV_EMAIL_DESTINATION`: Email for notifications

### Browser Management

- Puppeteer for web automation
- Browser health monitoring
- Automatic cleanup
- Configurable headless mode

## Dependencies

- **@nestjs/bull**: Queue processing
- **@badman/backend-visual**: Visual/toernooi.nl API integration
- **@badman/backend-pupeteer**: Browser automation
- **@badman/backend-database**: Database models and operations
- **@badman/backend-queue**: Queue definitions
- **@badman/backend-mailing**: Email notifications
- **@badman/backend-notifications**: In-app notifications
- **@badman/backend-ranking**: Ranking calculations

## Queue Jobs

The worker processes the following job types from `SyncQueue`:

1. `Sync.SyncEvents` - Main event synchronization
2. `Sync.EnterScores` - Enter scores into toernooi.nl
3. `Sync.CheckEncounters` - Batch check encounters
4. `Sync.CheckEncounter` - Single encounter check
5. `Sync.SyncRanking` - Ranking synchronization
6. `Sync.SyncTwizzit` - Twizzit synchronization

## Monitoring

- CronJob tracking for each job type
- Service status updates
- WebSocket events for real-time status
- Comprehensive logging with Winston
- Email notifications for critical operations
