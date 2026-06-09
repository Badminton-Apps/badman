# Tasks: Rescue Enrollment Remarks

**Input**: Design documents from `/specs/033-rescue-enrollment-remarks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required — Constitution Principle IV mandates resolver unit tests.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project scaffolding needed. The existing NestJS / Sequelize / Pug stack is used as-is.

No tasks — existing structure used.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB table + Sequelize model. All user story work depends on this.

**⚠️ CRITICAL**: These tasks MUST complete before any user story work begins.

- [ ] T001 Create migration `database/migrations/20260609000000-create_enrollment_remarks.js` — creates ENUM type `event.rescue_remark_source` and table `event.enrollment_remarks` with columns `id`, `clubId`, `season`, `remarks`, `adminEmail`, `source`, `createdAt`, `updatedAt`; `down` drops table then type. See [data-model.md](data-model.md) for full skeleton.
- [ ] T002 Create Sequelize model + GraphQL ObjectType `libs/backend/database/src/models/event/enrollment-remark.model.ts` — fields: `id` (UUID PK), `clubId` (FK → Club), `season` (Int), `remarks` (Text), `adminEmail` (String, nullable), `source` (ENUM 'rescue'|'normal'), `createdAt`; `@BelongsTo(() => Club)`. See [data-model.md](data-model.md) for full skeleton.
- [ ] T003 Export new model from event barrel `libs/backend/database/src/models/event/index.ts` — add `export * from './enrollment-remark.model'` inside the `// start:ng42.barrel` block.

**Checkpoint**: Migration runnable (`npx sequelize-cli db:migrate`); `EnrollmentRemark` importable from `@badman/backend-database`.

---

## Phase 3: User Story 1 - Club Admin Submits Rescued Remarks (Priority: P1) 🎯 MVP

**Goal**: Authenticated user submits club remarks → persisted in DB → notification email sent → returns `true`.

**Independent Test**: Call `saveEnrollmentRemarks` mutation with valid `clubId`, `season`, and `remarks`; confirm row in `event.enrollment_remarks` and `true` response.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Create GraphQL input type `libs/backend/graphql/src/resolvers/event/competition/save-enrollment-remarks.input.ts` — `@InputType() SaveEnrollmentRemarksInput` with fields `clubId: ID!`, `season: Int!`, `remarks: String!`, `adminEmail?: String`.
- [ ] T005 [P] [US1] Create Pug email template `libs/backend/mailing/src/compile/templates/rescue-remarks/html.pug` — extends `../../layouts/layout.pug`; renders club name, season, remarks, submittedAt timestamp.
- [ ] T006 [US1] Add `sendRescueRemarksMail(club: Club, season: number, remarks: string, submittedAt: Date)` to `libs/backend/mailing/src/services/mailing/mailing.service.ts` — `from: 'info@badman.app'`, `to: ['jeroen@badmintonvlaanderen.be', 'arno@dashdot.be']`, `subject: \`Inschrijving opmerking gered - \${club.name} (seizoen \${season})\``, `template: 'rescue-remarks'`, context: `{ clubName: club.name, season, remarks, submittedAt: submittedAt.toISOString() }`. Depends on T005.
- [ ] T007 [US1] Add `notifyRescueRemarks(club: Club, season: number, remarks: string, submittedAt: Date): Promise<void>` to `libs/backend/notifications/src/services/notification/notification.service.ts` — delegates to `this.mailing.sendRescueRemarksMail(...)`, logs on error, never rethrows. Depends on T006.
- [ ] T008 [US1] Create resolver `libs/backend/graphql/src/resolvers/event/competition/save-enrollment-remarks.resolver.ts` — `@Mutation(() => Boolean) saveEnrollmentRemarks(@User() user, @Args('input') input: SaveEnrollmentRemarksInput)`: (1) check `user?.id` else throw `PERMISSION_DENIED`; (2) `assertUUID(clubId)`; (3) `Club.findByPk(clubId)` — throw `CLUB_NOT_FOUND` if null; (4) trim remarks, throw `BAD_USER_INPUT` if empty; (5) open transaction, `EnrollmentRemark.create({ clubId, season, remarks: remarks.trim(), adminEmail: adminEmail ?? null, source: 'rescue' }, { transaction })`; (6) commit; (7) fire-and-forget `notificationService.notifyRescueRemarks(club, season, remarks, record.createdAt)`; (8) return `true`. Depends on T002, T004, T007.
- [ ] T009 [US1] Export new resolver and input from competition barrel `libs/backend/graphql/src/resolvers/event/competition/index.ts` — add `export * from './save-enrollment-remarks.resolver'` and `export * from './save-enrollment-remarks.input'` inside the `// start:ng42.barrel` block.
- [ ] T010 [US1] Register `SaveEnrollmentRemarksResolver` as a provider in `libs/backend/graphql/src/resolvers/event/competition.module.ts` — add to both `imports`-free provider list and ensure `NotificationsModule` is already imported (it is). Depends on T009.

### Tests for User Story 1 (Constitution Principle IV)

- [ ] T011 [US1] Create resolver unit test `libs/backend/graphql/src/resolvers/event/competition/save-enrollment-remarks.resolver.spec.ts` — follow pattern from `enrollmentSetting.resolver.spec.ts`: `Test.createTestingModule`, fake `Sequelize.transaction()` stub, `jest.spyOn(Club, 'findByPk')`, `jest.spyOn(EnrollmentRemark, 'create')`, mock `NotificationService.notifyRescueRemarks`, fake `Player` with `hasAnyPermission` jest.fn(). Cover happy-path cases AC1–AC4 from US1: (AC1) valid input → `create` called, returns `true`; (AC2) duplicate submission → second `create` call succeeds; (AC3) `adminEmail` provided → stored in `create` args; (AC4) no `adminEmail` → `create` called with `adminEmail: null`. Depends on T008.

**Checkpoint**: `saveEnrollmentRemarks` mutation works end-to-end; happy-path unit tests pass.

---

## Phase 4: User Story 2 - Invalid Input Rejected (Priority: P2)

**Goal**: Mutation rejects submissions with unknown `clubId` or empty/whitespace `remarks`.

**Independent Test**: Submit with unknown `clubId` → error; submit with `remarks: ""` → error; submit with `remarks: "   "` → error.

**Note**: Validation logic is implemented as part of T008 (resolver). This phase adds the error-path unit tests.

### Tests for User Story 2

- [ ] T012 [US2] Add error-path test cases to `libs/backend/graphql/src/resolvers/event/competition/save-enrollment-remarks.resolver.spec.ts` — cover AC1–AC3 from US2: (AC1) `Club.findByPk` returns null → throws `CLUB_NOT_FOUND`; (AC2) `remarks: ''` → throws `BAD_USER_INPUT`, no DB write; (AC3) `remarks: '   '` → throws `BAD_USER_INPUT`, no DB write. Also cover: (AC4) unauthenticated path: `user.id` undefined → throws `PERMISSION_DENIED`; (AC5) rollback-on-error: `EnrollmentRemark.create` throws unexpected error → `transaction.rollback()` called, error propagated (Constitution Principle IV required case). Depends on T011.

**Checkpoint**: All US1 and US2 unit tests pass; `nx test backend-graphql` green.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T013 Run `nx test backend-graphql` and confirm all tests pass (including new spec).
- [ ] T014 Run `nx lint backend-graphql` and confirm no lint errors.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on Phase 2 completion (T001–T003)
- **US2 (Phase 4)**: Depends on T008 + T011 (resolver implementation + base tests)
- **Polish (Phase 5)**: Depends on all prior phases

### Within US1 (Phase 3)

- T004 and T005 are independent — run in parallel
- T006 depends on T005 (template must exist before method references it)
- T007 depends on T006
- T008 depends on T002 (model), T004 (input), T007 (notification)
- T009 depends on T008
- T010 depends on T009
- T011 depends on T008 (resolver implementation)

### Parallel Opportunities

```bash
# Phase 2 — all three can run in parallel (different files):
T001  # migration
T002  # model
# T003 depends on T002

# Phase 3 — after T003 completes:
T004  # input type (no dependencies within phase)
T005  # pug template (no dependencies within phase)
# then: T006 → T007 → T008 → T009 → T010 → T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001 → T002 → T003)
2. Complete Phase 3: US1 (T004/T005 parallel → T006 → T007 → T008 → T009 → T010 → T011)
3. **STOP and VALIDATE**: Run mutation manually via GraphQL playground; check DB row; check email
4. Ship rescue tooling to club admins

### Incremental Delivery

1. Phase 2 + Phase 3 → Rescue mutation live (MVP)
2. Phase 4 → Error paths validated by tests
3. Phase 5 → Lint + cleanup

---

## Notes

- [P] tasks = different files, no dependencies between them
- Error codes: use `ErrorCode` constants from `libs/backend/graphql/src/utils/error-codes.ts`; do NOT inline strings
- Email non-production: `MailingService._sendMail` already overrides recipients with `DEV_EMAIL_DESTINATION`; no extra logic needed
- Barrel guard: `libs/backend/database/src/models/event/index.ts` uses `// start:ng42.barrel` markers — add export inside those markers
- Migration ENUM: create `event.rescue_remark_source` type BEFORE `createTable`; drop table BEFORE type in `down`
