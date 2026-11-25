# Implementation Plan: Fix Notifications for Encounter Change Flow

**Branch**: `fix/encounter-change-notifications` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

## Summary

Five notification bugs in the encounter-change flow are fixed without introducing new DB tables, notifier classes, or i18n JSON keys. The backend changes are confined to four files across three packages. The notification bell bug (FR-001) is a frontend concern tracked for cross-repo reference only.

## Technical Context

**Language/Version**: TypeScript 5, Node 20
**Primary Dependencies**: NestJS, Sequelize, nestjs-i18n, Pug (email templates), `@badman/backend-mailing`, `@badman/backend-notifications`
**Storage**: PostgreSQL — no schema changes required
**Testing**: Jest per-package (`turbo run test --filter=@badman/backend-notifications`, `--filter=@badman/backend-graphql`, `--filter=@badman/backend-mailing`)
**Target Platform**: NestJS API (Fastify, `apps/api`)
**Project Type**: Backend web service (NestJS monorepo)
**Performance Goals**: N/A — notification path is async fire-and-forget
**Constraints**: No new DB migrations; no changes to i18n JSON files (`all.json`)
**Scale/Scope**: Four files across three packages; one Pug template update

## Constitution Check

| Principle                                   | Status          | Notes                                                                                           |
| ------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| I — Code-First GraphQL via Sequelize Models | ✅ Pass         | No new models or input types                                                                    |
| II — Translation Discipline                 | ✅ Pass         | No `all.json` changes; email templates are Pug files outside the i18n system                    |
| III — Transactional Mutations               | ✅ Pass         | No new mutations; comment resolver notification call is post-commit, not inside the transaction |
| IV — Resolver Test Discipline               | ⚠ Must address | `comment.resolver.ts` changes require test update for `encounterChangeComment`                  |
| V — Frontend Lives in Separate Repository   | ✅ Pass         | Notification bell (FR-001) is tracked in spec but not implemented here                          |

## Project Structure

### Documentation (this feature)

```text
specs/038-fix-encounter-notifications/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (this feature)

```text
packages/backend-notifications/src/
└── services/notification/
    └── notification.service.ts        ← Bugs 1, 2, 4, 5

packages/backend-graphql/src/resolvers/comment/
├── comment.resolver.ts                ← Bug 2
└── comment.resolver.spec.ts           ← Test update (Principle IV)

packages/backend-mailing/src/
├── services/mailing/mailing.service.ts           ← Bug 3 (new param)
└── compile/templates/encounterchange/html.pug    ← Bug 3 (clearer content)
```

**Structure Decision**: Single-backend layout. All changes are within existing packages; no new package or app is created.

---

## Implementation Design

### Change A — Remove self-notification from `notifyEncounterChange` (Bug 1)

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

Remove the `notifierNew.notify(...)` block (approximately lines 126–140). After the fix, `notifyEncounterChange` sends exactly **one** email: the `CompetitionEncounterChangeConfirmationRequestNotifier` to the opposing team (`confReqTeam`).

```
BEFORE (two sends):
  notifierNew.notify(newReqTeam.captain, ...)    ← remove this block
  notifierConform.notify(confReqTeam.captain, ...)  ← keep

AFTER (one send):
  notifierConform.notify(confReqTeam.captain, ...)
```

The `notifierNew` variable and the `options`/imports for `CompetitionEncounterChangeNewRequestNotifier` can be removed from this method since nothing calls `sendNewRequestMail` any longer via this path.

---

### Change B — Add `notifyEncounterChangeMessage` for chat notifications (Bug 2)

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

Add a new public method:

```typescript
async notifyEncounterChangeMessage(
  encounter: EncounterCompetition,
  isHomeCommenting: boolean
): Promise<void>
```

Logic:

1. Load `homeTeam` and `awayTeam` with captain association.
2. Identify `opposingTeam = isHomeCommenting ? awayTeam : homeTeam`.
3. Build URL: `${CLIENT_URL}/my-club/${opposingTeam.clubId}/change-encounter/${encounter.id}`.
4. Reuse `CompetitionEncounterHasCommentNotifier` (already imported) to send `sendHasCommentMail` to the opposing team captain at `opposingTeam.email`.

**File**: `packages/backend-graphql/src/resolvers/comment/comment.resolver.ts`

Change line 212 in `encounterChangeComment`:

```ts
// BEFORE:
this.notificationService.notifyEncounterChange(link, home.clubId === comment.clubId);

// AFTER:
this.notificationService.notifyEncounterChangeMessage(link, home.clubId === comment.clubId);
```

---

### Change C — Clearer email content for confirmation email (Bug 3)

**File**: `packages/backend-mailing/src/services/mailing/mailing.service.ts`

Update `sendConfirmationRequestMail` signature to accept an optional `actingTeamName: string` parameter and pass it into the template context.

**File**: `packages/backend-mailing/src/compile/templates/encounterchange/html.pug`

Update the template body to:

- Display which team initiated the request using `actingTeamName` (or fall back to `isHome ? encounter.home.name : encounter.away.name`).
- The existing `encounter.home.name` and `encounter.away.name` are already available.

```pug
// BEFORE:
| er is een aanvraag tot wijziging van de aankomende ontmoeting tussen #{ encounter.home.name } en #{ encounter.away.name } is binnengekomen.

// AFTER:
| #{ actingTeamName } heeft een aanvraag ingediend om de ontmoeting tussen #{ encounter.home.name } en #{ encounter.away.name } te verplaatsen.
```

The caller of `sendConfirmationRequestMail` in `notification.service.ts` must pass the acting team name when it builds the notification.

---

### Change D — Fix default URL fallback from `LEGACY_CLIENT_URL` to `CLIENT_URL` (Bug 4)

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

In `_getEncounterChangeUrl`, change the `default` case:

```ts
// BEFORE:
default:
  return `${baseLegacyClientUrl}/competition/change-encounter?club=${team?.clubId}&team=${team?.id}&encounter=${encounter.id}&season=${season}`;

// AFTER:
default:
  return `${baseClientUrl}/my-club/${team?.clubId}/change-encounter/${encounter.id}`;
```

This makes calls from `propose`, `triage`, and `finalize` (which pass `frontendContext = undefined`) produce correct `CLIENT_URL`-based links automatically.

---

### Change E — Replace hardcoded toernooi.nl URLs (Bug 5)

**File**: `packages/backend-notifications/src/services/notification/notification.service.ts`

**`notifyEncounterHasComment`** (line ~329):

```ts
// BEFORE:
const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

// AFTER:
const url = `${this.configService.get("CLIENT_URL")}/competition/${event.id}`;
```

The `event` object is already loaded and checked for existence. `event.id` (internal UUID) is used to link to the competition page in the new app.

**`notifyEncounterNotAccepted`** (line ~362):

```ts
// BEFORE:
const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

// AFTER:
const url = `${this.configService.get("CLIENT_URL")}/my-club/${awayTeam.clubId}/change-encounter/${encounter.id}`;
```

The `awayTeam` is already loaded via `encounter.getAway()` at this point. `awayTeam.clubId` is available.

---

## Test Plan

### Unit test changes required (Principle IV)

**`comment.resolver.spec.ts`** (co-located with `comment.resolver.ts`):

- Existing spy on `notificationService.notifyEncounterChange` for `encounterChangeComment` → update to `notifyEncounterChangeMessage`.
- Add test case: `encounterChangeComment` calls `notifyEncounterChangeMessage` with `(encounter, true)` when home club comments, and `(encounter, false)` when away club comments.
- Verify `notifyEncounterChange` is NOT called for `encounterChange` linkType.

**`notification.service.spec.ts`** (if present; otherwise create):

- Test `notifyEncounterChangeMessage`: spy on `mailing.sendHasCommentMail`; verify only opposing team captain receives the call.
- Test `notifyEncounterChange` after Bug 1 fix: verify only the `sendConfirmationRequestMail` spy is called (not `sendNewRequestMail`).
- Test `_getEncounterChangeUrl` default case: verify it returns a `CLIENT_URL`-based URL, not `LEGACY_CLIENT_URL`.

### Manual test checklist

1. Propose dates as home team → away team captain receives one email (not home team).
2. Triage/endorse as away team → home team captain receives one email (not away team).
3. Finalize as home team → both captains receive confirmation email.
4. Post chat comment as home club → away captain receives "has comment" email; home captain does not.
5. Email link in any of the above opens `CLIENT_URL`-based URL (`/my-club/{clubId}/change-encounter/{encounterId}`).
6. `notifyEncounterNotAccepted` email link uses `CLIENT_URL`, not toernooi.nl.
7. `notifyEncounterHasComment` email link uses `CLIENT_URL`, not toernooi.nl.

---

## Complexity Tracking

No constitution violations. All changes are targeted modifications to existing services and templates; no new abstractions, patterns, or packages are introduced.
