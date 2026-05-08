# Phase 0 Research: finishEventEntry Hardening

## R1 — Concurrency / row locking

**Decision**: Inside the new transaction, acquire `SELECT ... FOR UPDATE` on the relevant `EventEntry` rows for the `(clubId, season)` set BEFORE running the idempotency precheck. In Sequelize: `EventEntry.findAll({ where: { ... }, transaction, lock: transaction.LOCK.UPDATE })`.

**Rationale**: Two browser tabs (or a retry-on-network-blip) can race the mutation. Without a row lock, both transactions read `sendOn === null` for the same entries, both proceed to write, and both dispatch a notification. The lock serialises competing submitters of the same `(clubId, season)`: the second transaction blocks until the first commits, then reads `sendOn !== null` and returns `alreadyFinalised: true`. PostgreSQL's default isolation (READ COMMITTED) is sufficient when combined with the row lock.

**Alternatives considered**:
- *Optimistic concurrency via a `version` column on `EventEntry`*: requires a schema migration, doesn't exist today, and adds complexity disproportionate to a single mutation.
- *Application-level mutex via Redis*: introduces a new failure mode (Redis down) for a problem the database can solve directly.
- *No locking, rely on isolation level*: fails — READ COMMITTED allows the race. Switching to SERIALIZABLE for one resolver is invasive and would need retry-on-serialization-failure plumbing across the resolver.

The `Team` rows are read with `include: [{ model: EventEntry }]`. The lock is applied via `EventEntry`'s rows since those carry `sendOn`, the field actually being raced on. Locking `Team` rows is unnecessary.

## R2 — Notification dispatch ordering

**Decision**: Run `notificationService.notifyEnrollment(...)` AFTER `await transaction.commit()` returns. Wrap the call in its own `try/catch`. On failure: log the error, set `notificationDispatched = false` on the result, return normally. On success: `notificationDispatched = true`. The result's `success: true` reflects the persistence outcome; `notificationDispatched` is the side-effect signal.

**Rationale**: Notifications go over SMTP and push gateways. Holding a transaction open across a network call is a known antipattern — it stalls connection pool capacity and turns transient mail-server slowness into database contention. Per FR-002, notification failure must NOT roll back the database; the entries are persisted, the federation can already see `sendOn`, so retrying the notification independently is the correct affordance.

**Alternatives considered**:
- *Notify inside the transaction (status quo)*: violates FR-002, holds connections, conflates two different failure surfaces.
- *Enqueue notification on a Bull queue, return immediately*: cleanest long-term, but adds a queue to a previously synchronous flow and changes user-visible behaviour (no synchronous "we sent the email" signal). Out of scope; can be revisited as a follow-up.

## R3 — Idempotency precheck location

**Decision**: Inside the transaction, after the row-lock acquire, before any writes:

```text
1. transaction.start
2. lock+read EventEntry rows for (clubId, season)
3. compute alreadyFinalised = entries.length > 0 && entries.every(e => e.sendOn !== null)
4. lookup Team rows for (clubId, season); if zero → throw NO_TEAMS_TO_FINALISE (rolls back txn)
5. if alreadyFinalised:
     5a. if club.contactCompetition !== email → update club.contactCompetition (single write)
     5b. commit
     5c. return { success: true, alreadyFinalised: true, notificationDispatched: false }
6. else fresh path: update club email if differs, set sendOn on null entries, write Logging
7. commit
8. post-commit: dispatch notification, set notificationDispatched accordingly
9. return { success: true, alreadyFinalised: false, notificationDispatched }
```

**Rationale**: Putting the precheck inside the transaction (rather than as a pre-flight read outside) keeps the lock + decision atomic. The post-commit notification only runs on the fresh path; on the no-op path nothing is dispatched, matching FR-003.

**Alternatives considered**:
- *Pre-flight read outside the transaction, then re-check inside*: doubles the query count for no behavioural gain.
- *Database-level unique constraint on `EventEntry.sendOn`*: nonsensical — `sendOn` is a timestamp, not a uniqueness attribute. The natural uniqueness key for finalisation lives at the *set* level (`(clubId, season)`), which a row-level constraint cannot express.

## R4 — Audit-log behaviour on idempotent path

**Decision**: When `alreadyFinalised: true`, write zero `Logging` rows. The contact-email side-effect on the no-op path is not audit-logged. Original finalisation already has its `EnrollmentSubmitted` row with the email at the time of submission; subsequent contact-email updates flow through the regular `Club.contactCompetition` audit story (or lack thereof — out of scope here).

**Rationale**: An audit row labelled `EnrollmentSubmitted` written when no submission happened would corrupt downstream queries that count submissions per season. The email update is a low-stakes data fix; if richer auditing is desired later, it belongs in a `updateClub` mutation, not as a side-channel of finalisation.

## R5 — `NO_TEAMS_TO_FINALISE` error-code semantics

**Decision**: Add `NO_TEAMS_TO_FINALISE: "NO_TEAMS_TO_FINALISE"` to the registry at [`libs/backend/graphql/src/utils/error-codes.ts`](../../libs/backend/graphql/src/utils/error-codes.ts) under a new `// Event entry finalisation` group. `extensions` payload: `{ code: "NO_TEAMS_TO_FINALISE", clubId: string, season: number }`. Thrown via `new GraphQLError("No teams to finalise for this club and season", { extensions })`.

**Rationale**: Matches the existing convention used by `createEnrollment` / `createTeam`. Frontend can map the code to a localised message using `extensionsCodeMap` style (per BAD-122 frontend) without parsing English message text.

## R6 — Result object placement & naming

**Decision**: Create [`libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts`](../../libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts) defining `FinishEventEntryResult` as a non-persistent `@ObjectType`. Keeps it next to the resolver (precedent: `team-result.object.ts` lives next to `team.resolver.ts`).

**Rationale**: Discoverability for reviewers; consistent with two existing reference implementations cited by Constitution Principle III.

## R7 — Spec coverage matrix

The new `entry.resolver.spec.ts` covers, at minimum, this matrix (each row = one `it(...)` test):

| # | Scenario | Models stubbed | Expected |
|---|----------|----------------|----------|
| 1 | unauthorized user (no perms) | `Player.hasAnyPermission` returns false | `UnauthorizedException`; no model writes |
| 2 | unknown clubId | `Club.findByPk` → null | `NotFoundException`; no other reads |
| 3 | zero teams for season | `Team.findAll` → `[]` | throws `GraphQLError` with `extensions.code === NO_TEAMS_TO_FINALISE`; transaction rolled back |
| 4 | fresh finalisation happy path | 3 teams, all entries `sendOn === null` | all `entry.save` called; one `Logging.create`; `transaction.commit`; notification dispatched once; result `{ success: true, alreadyFinalised: false, notificationDispatched: true }` |
| 5 | rollback on `Logging.create` throw | as #4 but `Logging.create` throws | `transaction.rollback`; no notification call; resolver re-throws |
| 6 | already-finalised no-op (same email) | every entry `sendOn !== null`; `club.contactCompetition === email` | no writes; no notification; result `{ success: true, alreadyFinalised: true, notificationDispatched: false }` |
| 7 | already-finalised + email differs | every entry `sendOn !== null`; `club.contactCompetition !== email` | only `club.save` called inside txn; no `Logging`, no `entry.save`; no notification; result `alreadyFinalised: true` |
| 8 | partial state (some entries null) | mix of `sendOn` set and null | only the null entries updated; one `Logging`; one notification; `alreadyFinalised: false` |
| 9 | team without entry row | `team.entry === null` | skipped in the loop; no error |
| 10 | notification fails post-commit | as #4 but `notifyEnrollment` rejects | DB writes committed; result `{ success: true, alreadyFinalised: false, notificationDispatched: false }`; resolver does NOT throw |
| 11 | row-lock query uses `LOCK.UPDATE` | inspect `findAll` call args | second arg includes `lock: transaction.LOCK.UPDATE` and the same `transaction` object |
| 12 | edit-any:club permission grants access | `hasAnyPermission` returns true on second arg | proceeds as #4 |

## R8 — Open follow-ups (not in this feature)

- Consider moving notification dispatch to a Bull queue for fire-and-forget delivery and built-in retry. Tracked as a tech-debt note candidate, not added here.
- Consider auditing `Club.contactCompetition` updates centrally (a generic audit on `Club` mutations). Out of scope.
