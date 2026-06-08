# Data Model: Resolver Test Coverage

**Branch**: `032-resolver-test-coverage` | **Date**: 2026-06-08

No new persistent entities. This document maps the test infrastructure "entities" — the stub shapes and module wiring for each resolver under test.

---

## Test infrastructure types

### MockTransaction

```typescript
{ commit: jest.Mock; rollback: jest.Mock }
// Created fresh in each beforeEach:
mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
```

### buildUser helper

```typescript
const buildUser = (allowed: boolean) =>
  ({ hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;
```

### Sequelize stub (with transaction)

```typescript
{ provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } }
```

### Sequelize stub (no mutations needed)

```typescript
{ provide: Sequelize, useValue: { transaction: jest.fn() } }
```

### Bull Queue stub

```typescript
import { getQueueToken } from '@nestjs/bull';
import { SyncQueue } from '@badman/backend-queue';

{ provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } }
```

---

## Per-resolver TestingModule provider map

### Group A — Sequelize only

Resolvers: `availability`, `faq`, `notification`, `claim`, `role`

```typescript
providers: [
  <Name>Resolver,
  { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
]
```

### Group B — No constructor (no DI)

Resolvers: `club-membership` (ClubPlayerMembershipsResolver), `service` (ServiceResolver)

```typescript
providers: [
  <Name>Resolver,
  // No Sequelize needed — resolver uses model statics only, no injected deps
]
```

### Group C — Sequelize + one service

Resolvers: `cronJob` (+ CronService), `rankingSystemGroup` (+ PointsService)

```typescript
// cronJob:
providers: [
  CronJobResolver,
  { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
  { provide: CronService, useValue: { listCrons: jest.fn(), updateCron: jest.fn() } },
]

// rankingSystemGroup:
providers: [
  RankingSystemGroupResolver,
  { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
  { provide: PointsService, useValue: { addGamePointsForSubEvents: jest.fn(), removeGamePointsForSubEvents: jest.fn() } },
]
```

### Group D — Sequelize + PointsService + SyncQueue + RankingSystemService

Resolvers: `event/competition/event`, `event/tournament/draw`, `event/tournament/event`, `event/tournament/subevent`

```typescript
providers: [
  <Name>Resolver,
  { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
  { provide: PointsService, useValue: { addGamePointsForSubEvents: jest.fn(), removeGamePointsForSubEvents: jest.fn() } },
  { provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } },
  { provide: RankingSystemService, useValue: { getById: jest.fn(), invalidate: jest.fn() } },
]
```

### Group E — Assembly resolver (no Sequelize)

```typescript
providers: [
  AssemblyResolver,
  { provide: AssemblyValidationService, useValue: { validate: jest.fn() } },
  { provide: RankingSystemService, useValue: { getById: jest.fn() } },
]
```

### Group F — EncounterChangeResolver (complex)

```typescript
providers: [
  EncounterChangeResolver,
  { provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } },
  { provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } },
  { provide: NotificationService, useValue: { notifyEncounterChange: jest.fn() } },
  { provide: EncounterValidationService, useValue: { validate: jest.fn() } },
]
```

---

## Minimum required test cases per resolver

| Resolver | Query tests | Mutation tests | ResolveField tests |
|----------|-------------|----------------|-------------------|
| availability | 2 (by id, list) | 2 (create, update) × 3 cases each | 2 (days, exceptions) |
| club-membership | 1 (list) | — | 2 (club, player) |
| cronJob | 1 (list) | 1 (update) × 3 cases | 1 (nextRun) |
| assembly | 1 (validate) | 1 (create) × 3 cases | 2 (titularsPlayers, baseTeamPlayers) |
| encounter-change | 2 (by id, list) | 2 (add, update) × 3 cases each | 1 (dates) |
| event/comp/event | 3 (by id, list, seasons) | 2 (update, copy) × 3 cases each | 4 field resolvers |
| tournament/draw | 2 (by id, list) | 2 (recalculate, sync) × 2 cases each | 3 field resolvers |
| tournament/event | 2 (by id, list) | 3 (update, remove, recalculate) × 3 cases | 1 field resolver |
| tournament/subevent | 2 (by id, list) | 2 (recalculate, sync) × 2 cases each | 3 field resolvers |
| faq | 2 (by id, list) | 3 (create, update, delete) × 3 cases each | — |
| notification | 2 (by id, list) | 1 (update) × 3 cases | 4 (encounter, competition, tournament, club) |
| rankingSystemGroup | 2 (by id, list) | 2 (add, remove subEvents) × 3 cases each | 2 (subEventCompetitions, subEventTournaments) |
| claim | 2 (by id, list) | 2 (assign, assignBulk) × 3 cases each | — |
| role | 2 (by id, list) | 4 (create, update, delete, addPlayer, removePlayer, updatePlayers) × 3 cases | 2 (players, claims) |
| service | 1 (list) | — | — |

**Standard 3-case mutation coverage**: unauthorized → `UnauthorizedException`, not-found → `NotFoundException`, success → commit called.

---

## Audit document structure

File: `specs/032-resolver-test-coverage/audit.md`

```markdown
# Resolver Audit

## Summary
| Category | Count |
|----------|-------|
| missing-auth | N |
| duplication | N |
| performance | N |
| code-quality | N |
| bug | N |

## Findings

| # | Category | File | Line | Issue | Suggested Remedy | Status |
|---|----------|------|------|-------|-----------------|--------|
| 1 | missing-auth | ... | ... | ... | ... | open/fixed/deferred |
```
