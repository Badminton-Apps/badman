---
description: "Task list for fix-encounter-notifications"
---

# Tasks: Fix Notifications for Encounter Change Flow

**Input**: Design documents from `specs/038-fix-encounter-notifications/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US2–US5 from spec.md; US1 is frontend-only)

---

## Phase 1: Setup

**Purpose**: No new infrastructure needed — all changes are edits to existing files in existing packages. This phase is a no-op; proceed directly to user story phases.

> **Note**: US1 (Notification Bell Clickable) is a frontend concern tracked in the spec for cross-repo visibility. It is not implemented in this backend repository. All tasks below cover the backend notification bugs (US2–US5).

---

## Phase 2: User Story 2 — Only the Opposing Party Receives Email Notifications (Priority: P1) 🎯 MVP

**Goal**: Remove the self-notification email sent to the acting party in `notifyEncounterChange`. After this change, only the opposing team captain receives an email when a proposal is submitted, endorsed, or rejected.

**Independent Test**: Trigger `proposeEncounterChangeDates` as home team; verify only the away team's captain receives an email, and the home team's captain does not.

### Implementation

- [x] T001 [US2] Remove the `notifierNew.notify(...)` block and `CompetitionEncounterChangeNewRequestNotifier` instantiation from `notifyEncounterChange` in `packages/backend-notifications/src/services/notification/notification.service.ts` (approximately lines 109–140; keep the `notifierConform.notify(...)` block that sends to `confReqTeam`)

**Checkpoint**: US2 complete — `notifyEncounterChange` now sends exactly one email (to the opposing party). Trigger a proposal and confirm only the opposing captain's email is queued.

---

## Phase 3: User Story 3 — Chat Messages Trigger a "New Message" Email (Priority: P2)

**Goal**: When a club posts a comment in an encounter-change chat thread, the opposing team captain receives a "new message" email (using the `hasComment` template). The acting party does not receive any email.

**Independent Test**: Post a comment on an encounterChange link type; verify the opposing team captain receives exactly one email using the `hasComment` template, and the commenting club receives no email.

### Implementation

- [x] T002 [US3] Add `async notifyEncounterChangeMessage(encounter: EncounterCompetition, isHomeCommenting: boolean): Promise<void>` to `NotificationService` in `packages/backend-notifications/src/services/notification/notification.service.ts`. The method must: load `homeTeam`/`awayTeam` with captain; identify `opposingTeam = isHomeCommenting ? awayTeam : homeTeam`; build URL `${CLIENT_URL}/my-club/${opposingTeam.clubId}/change-encounter/${encounter.id}`; call `new CompetitionEncounterHasCommentNotifier(this.mailing, this.push).notify(opposingTeam.captain, encounter.id, { encounter }, { email: opposingTeam.email, url })` only if captain and email exist.

- [x] T003 [US3] In `packages/backend-graphql/src/resolvers/comment/comment.resolver.ts`, change the notification call inside `encounterChangeComment` (line ~212) from `this.notificationService.notifyEncounterChange(link, home.clubId === comment.clubId)` to `this.notificationService.notifyEncounterChangeMessage(link, home.clubId === comment.clubId)`.

- [x] T004 [US3] Update `packages/backend-graphql/src/resolvers/comment/comment.resolver.spec.ts`: replace the spy on `notificationService.notifyEncounterChange` for the `encounterChange` linkType path with a spy on `notificationService.notifyEncounterChangeMessage`; add assertions that (a) `notifyEncounterChangeMessage` is called with `(encounter, true)` when the home club comments, (b) `notifyEncounterChangeMessage` is called with `(encounter, false)` when the away club comments, (c) `notifyEncounterChange` is NOT called for `encounterChange` linkType.

**Checkpoint**: US3 complete — posting a chat message triggers `notifyEncounterChangeMessage`; only the opposing captain receives a "has comment" email. Unit tests pass.

---

## Phase 4: User Story 4 — Notification Emails Contain Correct Deep Links (Priority: P2)

**Goal**: All encounter-change notification emails link to `CLIENT_URL`-based paths. No email uses `LEGACY_CLIENT_URL` or a hardcoded toernooi.nl URL.

**Independent Test**: Trigger any notification (propose, finalize, or `notifyEncounterNotAccepted`) without passing `frontendContext` and verify the generated URL starts with `CLIENT_URL` and matches `/my-club/{clubId}/change-encounter/{encounterId}`.

### Implementation

- [x] T005 [P] [US4] In `_getEncounterChangeUrl` in `packages/backend-notifications/src/services/notification/notification.service.ts`, change the `default` switch case from `return \`${baseLegacyClientUrl}/competition/change-encounter?club=...\`` to `return \`${baseClientUrl}/my-club/${team?.clubId}/change-encounter/${encounter.id}\``.

- [x] T006 [P] [US4] In `notifyEncounterHasComment` in `packages/backend-notifications/src/services/notification/notification.service.ts`, replace the hardcoded `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}` URL with `\`${this.configService.get("CLIENT_URL")}/competition/${event.id}\``(uses the already-validated`event.id` UUID).

- [x] T007 [P] [US4] In `notifyEncounterNotAccepted` in `packages/backend-notifications/src/services/notification/notification.service.ts`, replace the hardcoded `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}` URL with `\`${this.configService.get("CLIENT_URL")}/my-club/${awayTeam.clubId}/change-encounter/${encounter.id}\``(use`awayTeam`which is already loaded via`getAway()` earlier in the method).

**Checkpoint**: US4 complete — no toernooi.nl or LEGACY_CLIENT_URL appears in any encounter-change notification email. Log-inspect the generated URLs in dev or staging.

---

## Phase 5: User Story 5 — Email Content Clearly Describes the Action (Priority: P3)

**Goal**: The confirmation email sent to the opposing team (via `sendConfirmationRequestMail`) clearly states which team submitted the request, the team names, and optionally the proposed dates. The `encounterchange` Pug template is updated to render the acting team name.

**Independent Test**: Trigger a proposal and inspect the rendered `encounterchange.html` in `mails/` (dev mode file output); verify the body includes the requesting team's name and both encounter team names.

### Implementation

- [x] T008 [US5] In `sendConfirmationRequestMail` in `packages/backend-mailing/src/services/mailing/mailing.service.ts`, add `actingTeamName: string` to the mail context (derive it from the existing `isHome` flag and `encounter.home?.name` / `encounter.away?.name`, e.g. `actingTeamName: isHome ? encounter.home?.name ?? '' : encounter.away?.name ?? ''`). Pass this field in the `context` object sent to the `encounterchange` template.

- [x] T009 [US5] In `packages/backend-mailing/src/compile/templates/encounterchange/html.pug`, update the body paragraph to use `actingTeamName`: replace the generic "er is een aanvraag tot wijziging van de aankomende ontmoeting tussen..." sentence with one that states the acting team: e.g. `| #{ actingTeamName } heeft een aanvraag ingediend om de ontmoeting tussen #{ encounter.home.name } en #{ encounter.away.name } te verplaatsen.`

**Checkpoint**: US5 complete — the confirmation email body clearly names the requesting team. Inspect `mails/encounterchange.html` in dev mode after triggering a proposal.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify all changes pass linting and tests; confirm the full notification flow in staging.

- [x] T010 [P] Run `pnpm turbo run test --filter=@badman/backend-graphql` and confirm all comment resolver tests pass (including the updated T004 assertions).

- [x] T011 [P] Run `pnpm turbo run test --filter=@badman/backend-notifications` and confirm any existing notification service tests still pass (update mocks if `sendNewRequestMail` spy is no longer called).

- [x] T012 [P] Run `pnpm turbo run lint --filter=@badman/backend-notifications --filter=@badman/backend-graphql --filter=@badman/backend-mailing` and fix any lint errors.

- [x] T013 Run `pnpm turbo run build --filter=api` and confirm the API builds without TypeScript errors.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (US2)**: No prerequisites — can start immediately.
- **Phase 3 (US3)**: No prerequisites — independent of US2. T002 must complete before T003 and T004.
- **Phase 4 (US4)**: No prerequisites — T005, T006, T007 are all in the same file but logically independent (different methods); complete sequentially in any order.
- **Phase 5 (US5)**: No prerequisites — T008 must complete before T009 (template consumes the new context key).
- **Phase 6**: Depends on all implementation phases complete.

### User Story Dependencies

- **US2 (P1)**: Independent — start immediately.
- **US3 (P2)**: Independent of US2 — can be worked in parallel if desired.
- **US4 (P2)**: Independent of US2 and US3 — all changes are in `notification.service.ts` (different methods).
- **US5 (P3)**: Independent of all others — `mailing.service.ts` + Pug template only.

### Within Phase 4

T005, T006, T007 all edit `notification.service.ts` but different methods — run sequentially (same file; parallel editing would cause merge conflicts).

### Parallel Opportunities

- US2, US3, US4, and US5 implementation phases can start in parallel (different primary concerns).
- T005, T006, T007 within US4 can be staged as a single commit since they're in the same file.
- T010, T011, T012 in Phase 6 can all run in parallel.

---

## Parallel Example: US4

```bash
# These three edits all touch notification.service.ts — do them in sequence in one sitting:
T005: Fix _getEncounterChangeUrl default case
T006: Fix notifyEncounterHasComment URL
T007: Fix notifyEncounterNotAccepted URL
# Then commit all three together as one logical change.
```

---

## Implementation Strategy

### MVP First (US2 Only — T001)

1. Complete T001 (remove self-notification block).
2. **STOP and VALIDATE**: Trigger a proposal in dev/staging and confirm home team captain gets no email; away team captain gets one email.
3. Ship if urgency warrants — US3–US5 are independent improvements.

### Incremental Delivery

1. T001 (US2) → validate → commit.
2. T002–T004 (US3) → validate → commit.
3. T005–T007 (US4) → validate → commit.
4. T008–T009 (US5) → validate → commit.
5. T010–T013 (Polish) → CI green → PR.

---

## Notes

- All changes are edits to existing files — no new files, migrations, or i18n JSON updates.
- US1 (notification bell) is frontend-only; not implemented in this repo.
- `sendNewRequestMail` in `mailing.service.ts` becomes unused after T001 — leave it in place (removing it is a separate cleanup outside this scope).
- After T001, `CompetitionEncounterChangeNewRequestNotifier` is also effectively unused from the notification service; leave the class file in place.
- Pug template changes (T009) do not require `translation-manager` — Pug files are outside the i18n JSON system.
