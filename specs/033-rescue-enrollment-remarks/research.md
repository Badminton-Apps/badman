# Research: Rescue Enrollment Remarks

## Decision: Sequelize Model Schema

**Chosen**: `event` schema  
**Rationale**: `enrollment_remarks` is an enrollment-related event entity. All other enrollment-domain models (Entry, Standing, etc.) live in the `event` schema.  
**Alternatives considered**: `public` schema — rejected; too generic, breaks domain grouping.

---

## Decision: Source ENUM — PostgreSQL type vs VARCHAR + CHECK

**Chosen**: PostgreSQL native ENUM type (`rescue_remark_source`) via `DataType.ENUM`  
**Rationale**: Sequelize-typescript's `DataType.ENUM('rescue', 'normal')` emits a native PG ENUM. Consistent with other ENUM columns in the codebase. More self-documenting than CHECK constraint.  
**Migration note**: ENUM type must be created _before_ the table. The migration creates `rescue_remark_source` first, then the table. The `down` function drops the table then the type.

---

## Decision: Email delivery path

**Chosen**: Add `sendRescueRemarksMail()` to `MailingService`, call it from `NotificationService.notifyRescueRemarks()`, invoke that from the resolver post-commit (fire-and-forget — error logged, not rethrown).  
**Rationale**: Matches the existing `sendEnrollmentMail` → `ClubEnrollmentNotifier` / `notifyEnrollment` call chain. Keeps email logic in `@badman/backend-mailing`, orchestration in `@badman/backend-notifications`, and resolver stays thin.  
**DEV override**: `MailingService._sendMail` already redirects all non-production recipients to `DEV_EMAIL_DESTINATION`. No extra logic needed.  
**Alternatives considered**: Calling `MailingService` directly from the resolver — rejected; bypasses the notification abstraction and requires importing `MailingModule` into `@badman/backend-graphql` module directly instead of using the already-wired `NotificationsModule`.

---

## Decision: Email template

**Chosen**: New Pug template `rescue-remarks/html.pug`, extending the existing `../../layouts/layout.pug`.  
**Context fields**: `clubName` (string), `season` (number), `remarks` (string), `submittedAt` (string, pre-formatted).  
**Subject**: `Inschrijving opmerking gered - {clubName} (seizoen {season})`  
**Recipients**: `to: ['jeroen@badmintonvlaanderen.be', 'arno@dashdot.be']`, no cc.

---

## Decision: Input type — standalone @InputType vs OmitType/PartialType

**Chosen**: Standalone `@InputType() SaveEnrollmentRemarksInput` (not derived from `EnrollmentRemark`).  
**Rationale**: The mutation input (`clubId`, `season`, `remarks`, `adminEmail`) is a strict subset of the model but includes no generated fields (`id`, `source`, `createdAt`). A standalone InputType is cleaner and more explicit. Constitution Principle I allows standalone InputTypes when the model fields don't map cleanly.

---

## Decision: Resolver auth check

**Chosen**: Check `user?.id` is present (authenticated), throw `GraphQLError` with `ErrorCode.PERMISSION_DENIED` if not. No `hasAnyPermission` call.  
**Rationale**: FR-006 / Clarification B — trust frontend gate; any authenticated session accepted.

---

## Decision: Module wiring

**Chosen**: New `SaveEnrollmentRemarksModule` imports `NotificationsModule` + `DatabaseModule`. Registered in `GrapqhlModule` alongside the existing competition resolver modules.  
**Rationale**: Follows the existing module-per-resolver pattern (e.g. `SubmitEnrollmentModule`).
