# Research: Fix Notifications for Encounter Change Flow

**Feature**: 038-fix-encounter-notifications
**Branch**: `fix/encounter-change-notifications`
**Date**: 2026-06-22

---

## Decision 1: Bug 1 — Self-notification in `notifyEncounterChange`

**Rationale**: `NotificationService.notifyEncounterChange` currently fires two notifiers:

- `CompetitionEncounterChangeNewRequestNotifier` → `newReqTeam` (the acting party) via `sendNewRequestMail`
- `CompetitionEncounterChangeConfirmationRequestNotifier` → `confReqTeam` (opposing party) via `sendConfirmationRequestMail`

The first block (lines 126–140 of `notification.service.ts`) is the self-notification bug. The fix is to remove the `notifierNew.notify()` call entirely. Only the opposing party (`confReqTeam`) should be notified of a new proposal.

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

**Alternatives considered**:

- Adding a feature flag to skip self-notification: rejected — adds unnecessary complexity; the self-notification has no business value.
- Merging into a single notifier with a flag: rejected — would couple two different notification types into one class.

---

## Decision 2: Bug 2 — Chat message fires wrong notification

**Rationale**: `comment.resolver.ts:212` calls `notifyEncounterChange(link, home.clubId === comment.clubId)` when a comment is added to an encounterChange chat thread. This triggers the "new proposal" notification flow (wrong type) AND sends to both parties (Bug 1). The fix has two parts:

1. Add `notifyEncounterChangeMessage(encounter, isHomeCommenting)` to `NotificationService`:

   - Loads `homeTeam` and `awayTeam` with captain.
   - Identifies the opposing team (not the commenter's team).
   - Builds a `CLIENT_URL`-based URL: `/my-club/{opposingTeam.clubId}/change-encounter/{encounter.id}`.
   - Uses the existing `CompetitionEncounterHasCommentNotifier` (from `encounterEntered/hasComment.ts`) and `mailing.sendHasCommentMail` — these already produce a "has comment" email with the encounter details and a link.

2. Update `comment.resolver.ts:212` to call `notifyEncounterChangeMessage` instead of `notifyEncounterChange`.

**Why reuse `CompetitionEncounterHasCommentNotifier` / `sendHasCommentMail`**:

- The `hasComment` template already says "De ontmoeting X tegen Y heeft een opmerking" — exactly the right message for a chat comment.
- The method accepts `{ to, encounter, url }` which maps directly to what we need.
- Avoids creating a new notifier/template for this specific case.

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`, `packages/backend-graphql/src/resolvers/comment/comment.resolver.ts`

**Alternatives considered**:

- Creating a dedicated `CompetitionEncounterChangeMessageNotifier` and new template: rejected — over-engineering for what the `hasComment` template already covers.
- Calling `notifyEncounterHasComment` directly: rejected — that method sends to the **event contact** (the federation official), not the opposing team captain.

---

## Decision 3: Bug 3 — Unclear email content

**Rationale**: The `encounterchange/html.pug` template says:

> "er is een aanvraag tot wijziging van de aankomende ontmoeting tussen {home} en {away} binnengekomen"

It has `isHome` in context but never uses it to say which team requested the change. It also has no information about proposed dates.

**Fix**:

- Update `encounterchange/html.pug` to use the `isHome` variable to state: "Het verzoek werd ingediend door {home/away team name}."
- Pass the acting team name in the mail context (`actingTeam` string) so the template can render it without complex logic.
- Proposed dates are in `EncounterChangeDate` records. Rather than adding DB queries inside the mailing layer, pass them as an optional array (`proposedDates?: { date: Date }[]`) to `sendConfirmationRequestMail`. The template renders them if present.

**Files**: `packages/backend-mailing/src/compile/templates/encounterchange/html.pug`, `packages/backend-mailing/src/services/mailing/mailing.service.ts`

**Alternatives considered**:

- Full i18n for email content: rejected — email templates are Pug files, not JSON keys; the constitution only mandates the `translation-manager` for `all.json` keys. Pug template edits are fine directly.
- Separate templates for home-requested vs away-requested: rejected — unnecessary duplication; a simple conditional in Pug is sufficient.

---

## Decision 4: Bug 4 — Broken URL when `frontendContext` is undefined

**Rationale**: `_getEncounterChangeUrl` switch `default` case (line 696) uses `LEGACY_CLIENT_URL`:

```ts
default:
  return `${baseLegacyClientUrl}/competition/change-encounter?club=${team?.clubId}&team=${team?.id}&encounter=${encounter.id}&season=${season}`;
```

The new `propose`, `triage`, and `finalize` service methods all call `notifyEncounterChange` / `notifyEncounterChangeFinished` without passing `frontendContext`, so they always hit this branch and produce legacy URLs.

**Fix**: Change the `default` case to use `CLIENT_URL`:

```ts
default:
  return `${baseClientUrl}/my-club/${team?.clubId}/change-encounter/${encounter.id}`;
```

This matches the `/my-club/{clubId}/change-encounter/{encounterId}` pattern specified in FR-006.

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

**Alternatives considered**:

- Passing `frontendContext: "my-club"` from the service callers: rejected — the service layer has no knowledge of frontend routing and adding this coupling is fragile. Fixing the default is cleaner.
- Removing `LEGACY_CLIENT_URL` fallback entirely: left for future; for now, only the `default` case is changed. Named cases (`my-club`, `club`, `competition`) remain and might be used by legacy callers.

---

## Decision 5: Bug 5 — Hardcoded toernooi.nl URLs

### `notifyEncounterHasComment`

**Rationale**: Lines 328–330 build a toernooi.nl URL for the event contact notification. This is for result comments on a match (game leader / referee comments). Since we don't have a dedicated new-app encounter-result page path confirmed, the safest `CLIENT_URL`-based link uses the competition event page:

```
${CLIENT_URL}/competition/${event.id}
```

The `event.id` (internal UUID) is available from `encounter.drawCompetition?.subEventCompetition?.eventCompetition?.id`. The event is already checked for existence earlier in the method.

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

### `notifyEncounterNotAccepted`

**Rationale**: Lines 361–362 build a toernooi.nl URL for the away team captain. This is about a change request not being accepted. The away team is already loaded in this method. URL:

```
${CLIENT_URL}/my-club/${awayTeam.clubId}/change-encounter/${encounter.id}
```

The `awayTeam.clubId` is available from the `getAway()` call at line 351.

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

---

## Decision 6: Frontend — Notification Bell Not Clickable

**Rationale**: This is a frontend concern; the frontend lives in a separate repository. No backend changes are required. The spec records this requirement for cross-repo tracking (FR-001, SC-001). Not implemented in this branch.

---

## Affected Files Summary

| File                                                                               | Bugs Fixed |
| ---------------------------------------------------------------------------------- | ---------- |
| `packages/backend-notifications/src/services/notification/notification.service.ts` | 1, 2, 4, 5 |
| `packages/backend-graphql/src/resolvers/comment/comment.resolver.ts`               | 2          |
| `packages/backend-mailing/src/services/mailing/mailing.service.ts`                 | 3          |
| `packages/backend-mailing/src/compile/templates/encounterchange/html.pug`          | 3          |

No new notifier classes, no new DB migrations, no i18n JSON changes needed.
