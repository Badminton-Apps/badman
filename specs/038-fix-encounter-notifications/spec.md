# Feature Specification: Fix Notifications for Encounter Change Flow

**Feature Branch**: `fix/encounter-change-notifications`
**Created**: 2026-06-22
**Status**: Draft
**Input**: User description: "Fix email notifications for encounter change (relocation) flow"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Notification Bell is Clickable (Priority: P1)

Users see a notifications icon in the top-right corner of the application. Clicking it must open the notification panel so they can view their notifications. Currently the button is present but not interactive, making the entire in-app notification system unreachable.

**Why this priority**: If the notification button is broken, no in-app notification — regardless of how correctly it was generated — is ever seen. This is the most fundamental blocker.

**Independent Test**: Log in as any user, observe the notification icon in the top-right corner, click it, and verify a notification panel or dropdown opens without errors.

**Acceptance Scenarios**:

1. **Given** a logged-in user with one or more notifications, **When** they click the notification bell icon, **Then** a panel opens listing their notifications.
2. **Given** a logged-in user with zero notifications, **When** they click the notification bell icon, **Then** a panel opens with an appropriate empty state (e.g. "No notifications").
3. **Given** the notification panel is open, **When** the user clicks outside it, **Then** the panel closes.

---

### User Story 2 - Only the Opposing Party Receives Email Notifications (Priority: P1)

When a club submits a date-change proposal, endorses a proposed date, or declines dates, only the other party in the encounter should receive an email notification. The acting party must not receive a copy of their own action.

**Why this priority**: This is the most disruptive bug — every action floods the acting party's inbox with their own notifications. Fixing it eliminates confusing duplicate emails and aligns with the intended "notify the other side" behaviour across all steps of the flow.

**Independent Test**: Trigger any step of the encounter-change flow (propose / endorse / finalize) as a club user and verify that no notification email arrives in that user's own inbox, while the opposing club receives exactly one email.

**Acceptance Scenarios**:

1. **Given** the home team submits a date-change proposal, **When** the proposal is saved, **Then** only the away team's notification contacts receive an email; the home team receives no email.
2. **Given** the away team endorses a proposed date, **When** the endorsement is saved, **Then** only the home team's notification contacts receive an email; the away team receives no email.
3. **Given** the home team finalizes an endorsed date, **When** finalization is saved, **Then** both teams receive a confirmation email (finalization is an agreed outcome — both parties should be informed).
4. **Given** the away team rejects all proposed dates, **When** rejection is saved, **Then** only the home team receives a notification; the away team receives no email.

---

### User Story 3 - Chat Messages Trigger a "New Message" Email (Priority: P2)

When a club user posts a comment in the encounter-change chat thread, the opposing party receives an email informing them of the new message. The email must not be a duplicate of the "new proposal" notification.

**Why this priority**: Without this fix, no useful message notification reaches the opposing party (the wrong notification type is fired), making the chat feature effectively invisible by email.

**Independent Test**: Post a comment on an encounter-change request and verify the opposing club receives a "new message" email (distinct from a "new proposal" email), while the commenting club does not.

**Acceptance Scenarios**:

1. **Given** the home team posts a chat message on an encounter-change request, **When** the message is saved, **Then** the away team receives a "new message" email; the home team receives no email.
2. **Given** the away team posts a chat message, **When** the message is saved, **Then** the home team receives a "new message" email; the away team receives no email.
3. **Given** a club has disabled email notifications for encounter changes, **When** a chat message is posted, **Then** that club does not receive the message email (existing notification preference gates apply).

---

### User Story 4 - Notification Emails Contain Correct Deep Links (Priority: P2)

Every notification email related to an encounter change must contain a working link that takes the recipient directly to the encounter-change request in the current web application. Legacy-platform URLs (toernooi.nl) must never appear in these emails.

**Why this priority**: Broken or wrong links render the notification useless — the recipient cannot act on it. This affects every email sent by the encounter-change flow.

**Independent Test**: Receive a notification email for any encounter-change event (proposal, message, finalization) and verify the embedded link opens the correct page in the current application, not the legacy platform.

**Acceptance Scenarios**:

1. **Given** a notification is generated for an encounter-change request, **When** the email is rendered, **Then** the link follows the pattern `/my-club/{clubId}/change-encounter/{encounterId}` and resolves to the current application.
2. **Given** no explicit frontend context is provided by the caller, **When** the URL is built, **Then** the system falls back to `CLIENT_URL` (not `LEGACY_CLIENT_URL`) to construct the link.
3. **Given** `notifyEncounterHasComment` is triggered, **When** the email is rendered, **Then** the link uses `CLIENT_URL` with the correct path, not a hardcoded toernooi.nl domain.
4. **Given** `notifyEncounterNotAccepted` is triggered, **When** the email is rendered, **Then** the link uses `CLIENT_URL` with the correct path, not a hardcoded toernooi.nl domain.

---

### User Story 5 - Email Content Clearly Describes the Action (Priority: P3)

Notification emails state which encounter is affected, which date was proposed or accepted, and which club took the action, so the recipient can understand the notification without logging in.

**Why this priority**: Clear content reduces support questions and helps recipients decide whether the email requires immediate attention. Lower priority because the flow works even with unclear content — recipients can still navigate to the app.

**Independent Test**: Receive a proposal notification email and verify it includes at minimum: the two teams involved, the proposed date(s), and which club initiated the request.

**Acceptance Scenarios**:

1. **Given** the home team proposes new dates, **When** the away team receives the notification email, **Then** the email body identifies the home team, the away team, and each proposed date.
2. **Given** the away team endorses a date, **When** the home team receives the notification email, **Then** the email body identifies the date that was endorsed and which team endorsed it.
3. **Given** finalization is confirmed, **When** both teams receive the confirmation email, **Then** the email body states the newly confirmed date and which encounter was changed.

---

### Edge Cases

- What happens when an encounter-change notification is triggered for an encounter that has been deleted or whose teams no longer exist? The system should skip sending rather than crash.
- How does the system behave when `CLIENT_URL` is not configured? The notification service should log a warning and omit the link rather than emit an empty or malformed URL.
- What if both teams belong to the same club? The "only notify the other party" rule should still apply — check which role (home vs. away) the actor played, not the club identity alone.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The notification bell icon in the application header MUST be clickable and MUST open a panel displaying the current user's notifications.
- **FR-002**: The system MUST send encounter-change proposal notifications only to the party that did NOT submit the proposal.
- **FR-003**: The system MUST send triage/endorsement notifications only to the party that did NOT perform the triage action.
- **FR-004**: The system MUST send finalization confirmation emails to both the home and away teams (finalization is a bilateral outcome).
- **FR-005**: When a comment is added to an encounter-change chat thread, the system MUST send a "new message" notification (not a "new proposal" notification) to the party that did NOT post the comment.
- **FR-006**: All encounter-change notification emails MUST include a link constructed from `CLIENT_URL` with the path `/my-club/{clubId}/change-encounter/{encounterId}`.
- **FR-007**: The URL-generation logic MUST use `CLIENT_URL` as the default when no explicit frontend context is provided; it MUST NOT fall back to `LEGACY_CLIENT_URL`.
- **FR-008**: `notifyEncounterHasComment` MUST use `CLIENT_URL` for link generation; the hardcoded toernooi.nl domain MUST be removed.
- **FR-009**: `notifyEncounterNotAccepted` MUST use `CLIENT_URL` for link generation; the hardcoded toernooi.nl domain MUST be removed.
- **FR-010**: Notification emails MUST include the names of both competing teams, the relevant date(s), and the identity of the acting party.
- **FR-011**: All existing notification preference gates (e.g. club-level email opt-out) MUST continue to apply to the new and corrected notifications.

### Key Entities

- **EncounterChange**: Tracks the change request for a given encounter; links to EncounterChangeDate records and the EncounterCompetition.
- **EncounterChangeDate**: A single proposed or accepted date within a change request, carrying its status (PENDING / TENTATIVELY_ACCEPTED / ACCEPTED / REJECTED / RESOLVED).
- **EncounterCompetition**: The scheduled encounter between home and away teams; holds the current and original dates.
- **Notification**: The in-app and email notification record sent to a club or player.
- **Comment**: A chat message posted on an EncounterChange; triggers a "new message" notification.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The notification bell is clickable and opens a notification panel for 100% of logged-in users regardless of notification count (including zero).
- **SC-002**: Zero notification emails are delivered to the acting party for propose, triage, and rejection actions (verifiable by integration test or manual inspection of outgoing mail in staging).
- **SC-003**: 100% of chat-message events on encounter-change requests produce a "new message" email to the opposing party, and 0% produce a spurious "new proposal" email.
- **SC-004**: 100% of encounter-change notification emails contain a valid link to `CLIENT_URL`; no email contains a toernooi.nl domain or a `LEGACY_CLIENT_URL` fallback link.
- **SC-005**: Each notification email includes the two team names, the relevant date, and the acting club's name — verifiable by reviewing the email template output in tests or staging.

## Assumptions

- The multi-date proposal flow (propose / triage / finalize) is already implemented on the `feat/037-encounter-multi-date-proposals` branch; this feature branches from it.
- `CLIENT_URL` is a correctly configured environment variable in staging and production; `LEGACY_CLIENT_URL` is only kept for non-encounter-change notifications that still legitimately use it.
- The notification-preference system (club-level opt-in/opt-out for email) is out of scope for this fix; existing preference checks are preserved as-is.
- Simplifying or redesigning the notification settings UI is explicitly out of scope.
- The `clubId` needed for the deep-link path is available from the encounter's home or away team at the time the notification is sent.
- "Finalization" emails intentionally notify both parties — this is a bilateral confirmation, not a one-sided action.
- The notification bell fix is a frontend concern (the frontend lives in a separate repository); this spec records the requirement so it can be tracked and referenced alongside the backend email fixes.
