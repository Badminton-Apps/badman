# Resolver Audit — 033 resolvers (all backend-graphql)

**Date**: 2026-06-08  
**Coverage baseline** (post-spec addition): statements 50%, branches 31%, functions 26%, lines 48%

Categories checked per resolver:
1. **Missing auth** — mutations reachable without permission check
2. **Duplication** — logic repeated across resolvers without extraction
3. **N+1 performance** — ResolveFields issuing individual queries per parent row
4. **Code quality** — structural issues, dead code, naming inconsistency
5. **Bugs** — observable incorrect behavior
6. **Missing idempotency** — create mutations lacking alreadyExisted semantics (Constitution Principle III)

Legend: ✅ OK · ⚠️ Warn · 🚨 Issue

---

## 1. assembly.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 1 | Missing auth | ⚠️ | `createAssembly` — no `hasAnyPermission` call. Any authenticated user can write assembly for any encounter. Intentional (player self-submission), but should be documented. |
| 2 | Missing idempotency | ✅ | Uses `findOrCreate`; updates existing record. Pattern is correct but doesn't return `alreadyExisted`. |
| 3 | Code quality | ⚠️ | Error handler returns `null` instead of throwing — GraphQL client sees `null` with no error. Silences real failures. |
| 4 | N+1 | ⚠️ | `titularsPlayers` and `baseTeamPlayers` ResolveFields call `player.getCurrentRanking(systemId)` per player in a loop — unbatched. |

---

## 2. availability.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 5 | Missing auth | ⚠️ | `createAvailability` — auth check is inside the transaction, after location lookup. If location not found, rollback happens before auth check fires. Auth should precede DB work. |
| 6 | Missing idempotency | 🚨 | No uniqueness key check. Creating two availabilities for the same location+period creates duplicate rows. |
| 7 | Naming | ⚠️ | Resolver class named `AvailabilitysResolver` (typo: double-s). |

---

## 3. calculate-index.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 8 | Auth | ✅ | No mutations. Read-only. |
| 9 | N+1 | ✅ | Calculation performed in service layer. |

---

## 4. claim.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 10 | Auth | ✅ | `edit:claims` checked before transaction. |
| 11 | Duplication | ⚠️ | `assignClaim` and `assignClaims` share identical addClaim/removeClaim logic. Extract to private method. |

---

## 5. club-membership.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 12 | Auth | ⚠️ | `clubPlayerMemberships` is a **query** requiring `change:transfer`. Unusual — auth on read-only operations prevents viewing historical transfer data by non-admin. Intentional, but worth reviewing with product. |
| 13 | N+1 | 🚨 | `club()` and `player()` ResolveFields call `membership.getClub()` / `membership.getPlayer()` per row. With 100 memberships → 200 extra queries. Use DataLoader or eager-load with `include`. |

---

## 6. club.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 14 | Auth | ✅ | All mutations check permissions. |
| 15 | Idempotency | ✅ | `addPlayerToClub` uses `upsertMembership` service. |
| 16 | N+1 | ⚠️ | `players()` ResolveField calls `club.getPlayers()` per club row. Acceptable if clubs are typically queried individually. |

---

## 7. comment.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 17 | Idempotency | ✅ | `addComment` uses `findOrCreate`. |
| 18 | Auth | ✅ | Permission checked via `linkId_change:comment`. |

---

## 8. cronJob.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 19 | Code quality | ⚠️ | `_cronsService.onModuleInit()` called before `transaction.commit()`. If commit fails, cron jobs are re-initialized against stale DB state. Move call after commit. |
| 20 | Auth | ✅ | `change:job` checked. |

---

## 9. event/competition/draw.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 21 | Auth | ✅ | `edit:competition` checked for mutations. |
| 22 | N+1 | ⚠️ | `encounterCompetitions()` ResolveField returns `draw.getEncounterCompetitions()` per draw row. |

---

## 10. event/competition/encounter-change.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 23 | Code quality | ⚠️ | `addChangeEncounter` is 200+ lines. Extract date-change logic and acceptance logic into dedicated private methods (partially done with `processAcceptedEncounterChange`). |
| 24 | Auth | ✅ | Auth checked via home/away club permission before transaction. |
| 25 | Code quality | ⚠️ | `syncQueue.add` failure after commit is silently swallowed (`catch` logs but doesn't rethrow). No retry or dead-letter mechanism. |

---

## 11. event/competition/encounter.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 26 | N+1 | 🚨 | `encounterChange()` ResolveField calls `encounter.getEncounterChange()` per encounter. `games()` ResolveField calls `encounter.getGames()` per encounter. Both should use DataLoader. |
| 27 | Auth | ✅ | Mutations gate on club permissions. |

---

## 12. event/competition/enrollment.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 28 | Auth | ✅ | Uses `GraphQLError` with `ErrorCode.PERMISSION_DENIED` — compliant with Constitution Principle II. |
| 29 | Idempotency | ✅ | Returns `EnrollmentResult` with `alreadyExisted` — compliant with Constitution Principle III. |

---

## 13. event/competition/event.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 30 | Auth | ✅ | All mutations check `edit:competition`, `delete:competition`, `re-sync:points`. |
| 31 | Duplication | 🚨 | `addGamePointsForSubEvents` / `removeGamePointsForSubEvents` are duplicated almost verbatim in `event/tournament/event.resolver.ts` and `ranking/rankingSystemGroup.resolver.ts`. Extract to shared service in `backend-ranking`. |
| 32 | N+1 | ⚠️ | `copyEventCompetition` iterates all sub-events/draws/encounters in nested loops without bulk operations. |

---

## 14. event/competition/submit-enrollment.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 33 | Auth | ✅ | Permission checked. |
| 34 | Code quality | ✅ | Delegates to service layer. |

---

## 15. event/entry.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 35 | N+1 | ⚠️ | `players()` ResolveField calls `eventEntry.getPlayers()` per entry row. |
| 36 | Auth | ✅ | Read-only queries are public. |

---

## 16. event/tournament/draw.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 37 | Auth | ✅ | `re-sync:points`, `sync:tournament` checked. |
| 38 | Duplication | 🚨 | `recalculateDrawTournamentRankingPoints` logic duplicated in subevent and event tournament resolvers. Extract to `PointsService`. |
| 39 | N+1 | ⚠️ | `games()` ResolveField calls `draw.getGames()` per draw. |

---

## 17. event/tournament/event.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 40 | Auth | ✅ | `edit-any:tournament`, `delete-any:tournament`, `re-sync:points`, `sync:tournament` checked. |
| 41 | Duplication | 🚨 | `addGamePointsForSubEvents` / `removeGamePointsForSubEvents` duplicated — same as finding #31. |

---

## 18. event/tournament/subevent.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 42 | Auth | ✅ | Mutations guarded by `re-sync:points`, `sync:tournament`. |
| 43 | Duplication | 🚨 | `recalculateSubEventTournamentwRankingPoints` repeats the same points-recalculation pattern from draw and event resolvers. |
| 44 | Naming | ⚠️ | Method name `recalculateSubEventTournamentwRankingPoints` has double-letter typo (`...Tournamentw...`). |

---

## 19. faq.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 45 | Auth | ✅ | `add:faq` / `edit:faq` checked. |
| 46 | Bug | ⚠️ | `faq(id)` query returns `null` instead of throwing `NotFoundException`. Inconsistent with most other `*Resolver.entity(id)` queries which throw. Client must handle both null and throw. |

---

## 20. game.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 47 | Auth | ✅ | Mutations check club/admin permissions. |
| 48 | N+1 | ⚠️ | `players()` ResolveField calls game association per game row. |

---

## 21. lastRankingPlace.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 49 | Auth | ✅ | No active mutations (commented out). |
| 50 | Code quality | ⚠️ | Two commented-out `@Mutation` blocks left in source — dead code. Remove or implement. |

---

## 22. location.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 51 | Auth | ✅ | `${clubId}_edit:location` checked. |
| 52 | N+1 | ⚠️ | `club()` ResolveField calls `location.getClub()` per location. |

---

## 23. notification.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 53 | Auth | ⚠️ | `updateNotification` uses `sendToId !== user.id` instead of `hasAnyPermission`. No admin override path — admins cannot update any notification on behalf of users. |
| 54 | Bug | ⚠️ | Transaction is started before the NotFoundException check on `findByPk`. If notification not found, `rollback()` is called from the catch, but the transaction was opened unnecessarily. Minor resource waste. |

---

## 24. player.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 55 | Auth | ✅ | `add:player`, `edit:player`, `${playerId}_edit:player` checked on mutations. |
| 56 | N+1 | ⚠️ | `games()` ResolveField returns `player.getGames()` per player. Acceptable for single-player views, problematic for list queries. |

---

## 25. rankingPlace.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 57 | Auth | ✅ | Read-only resolver. |
| 58 | N+1 | ✅ | Queries use ListArgs/findOptions with filters. |

---

## 26. rankingPoint.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 59 | Auth | ✅ | Read-only resolver. |

---

## 27. rankingSystem.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 60 | Auth | ✅ | `edit:ranking` checked. |
| 61 | Duplication | ⚠️ | `getRankingGroups` ResolveField duplicates logic available via `rankingSystemGroup.resolver.ts`. |

---

## 28. rankingSystemGroup.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 62 | Auth | ✅ | `add:event` / `remove:event` checked. |
| 63 | Duplication | 🚨 | `addGamePointsForSubEvents` / `removeGamePointsForSubEvents` third copy — see finding #31. |
| 64 | Bug | ⚠️ | `removeSubEventsToRankingGroup` calls `addGamePointsForSubEvents` (not `removeGamePointsForSubEvents`) when removing subevents — copy-paste error. Points are added instead of removed. |

---

## 29. role.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 65 | Auth | ⚠️ | Auth checked AFTER `findByPk` in `updateRole` and `deleteRole`. If role doesn't exist, `NotFoundException` is thrown before the permission check — leaks information about role existence to unauthorized callers. |
| 66 | Duplication | ⚠️ | `addPlayerToRole`, `removePlayerFromRole`, `updateRolePlayers` share similar auth check patterns. Extract `requireRoleEditPermission(user, dbRole)` helper. |

---

## 30. service.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 67 | Auth | ✅ | Read-only resolver. No mutations. |

---

## 31. setting.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 68 | Auth | ✅ | `change:settings` checked. |
| 69 | Idempotency | ✅ | `updateEnrollmentSetting` — correct upsert pattern. |

---

## 32. team.resolver.ts

| # | Category | Severity | Finding |
|---|----------|----------|---------|
| 70 | Auth | ✅ | `createTeam` uses `GraphQLError` + `ErrorCode.PERMISSION_DENIED`. |
| 71 | Idempotency | ✅ | `createTeam` returns `TeamResult { alreadyExisted }` — compliant with Constitution Principle III. |
| 72 | N+1 | ⚠️ | `players()` ResolveField branches on `teamAssociationService.getPlayers()` vs `team.getPlayers()`. Both are per-row. |

---

## 33. player/notification.resolver.ts → (see #23 above)

*(File lives under `/notification/` not `/player/`; merged above.)*

---

## Priority Findings Summary

### 🚨 Critical (fix before next production incident)

| ID | Finding |
|----|---------|
| #64 | `removeSubEventsToRankingGroup` calls `addGamePoints` instead of `removeGamePoints` — ranking points not removed when subevents removed from group. |
| #31/#41/#63 | `addGamePointsForSubEvents` duplicated 3× across resolvers — diverged already. Centralise in `PointsService`. |
| #13 | `club-membership.resolver.ts` — N+1: `getClub()` + `getPlayer()` per membership row. |
| #26 | `encounter.resolver.ts` — N+1: `getEncounterChange()` + `getGames()` per encounter row. |

### ⚠️ High (address in next sprint)

| ID | Finding |
|----|---------|
| #19 | `cronJob` — `onModuleInit()` called before `commit()`. Move post-commit. |
| #3 | `assembly` — error swallowed as `null`; real DB errors are invisible to clients. |
| #65 | `role` — auth after `findByPk` leaks existence info. |
| #6 | `availability` — no uniqueness check on create; duplicate rows possible. |
| #46 | `faq(id)` returns `null` instead of `NotFoundException` — inconsistent contract. |

### ⚠️ Medium (backlog)

| ID | Finding |
|----|---------|
| #11 | `claim` — `assignClaim`/`assignClaims` duplication. |
| #20 | Dead code in `lastRankingPlace.resolver.ts`. |
| #44 | Typo: `recalculateSubEventTournamentwRankingPoints`. |
| #29/#66 | `role` resolver auth-after-lookup and duplicated permission helpers. |
| #53 | `notification` auth — no admin override path. |

---

## Idempotency Compliance (Constitution Principle III)

| Resolver | Create Mutation | Idempotent? | Notes |
|----------|----------------|-------------|-------|
| `team` | `createTeam` | ✅ | Returns `TeamResult { alreadyExisted }` |
| `enrollment` | `createEnrollment` | ✅ | Returns `EnrollmentResult { alreadyExisted }` |
| `assembly` | `createAssembly` | ⚠️ | Uses `findOrCreate` but returns entity, not `alreadyExisted` flag |
| `comment` | `addComment` | ⚠️ | Uses `findOrCreate` but no `alreadyExisted` flag |
| `club` | `createClub` | ❌ | No uniqueness check; duplicate slugs possible |
| `faq` | `createFaq` | ❌ | No uniqueness key; duplicates possible |
| `availability` | `createAvailability` | ❌ | No uniqueness key |
| `location` | `createLocation` | ❌ | No uniqueness key |
| `role` | `createRole` | ❌ | No uniqueness key |
| `player` | `createPlayer` | ❌ | Check memberId uniqueness exists in DB but not returned |

**Trivial fixes applied in this PR** (≤5 lines, no model/schema change): none — all idempotency gaps require schema changes or result type additions, violating the trivial-fix threshold.
