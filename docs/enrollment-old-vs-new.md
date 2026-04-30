# Enrollment feature: Old (Angular) vs New (Next.js) — technical comparison

**Audience:** internal engineering reference for finishing/polishing the new enrollment feature.
**Generated:** 2026-04-29.
**Scope:** the per‑club "team enrollment for next season" wizard. Compares the legacy Angular implementation against the new Next.js implementation and against the (unchanged) NestJS backend that both target.

Paths are absolute from `/Users/arno/Documents/Projects/Badman/`.

> Shorthand used throughout this doc:
>
> - **OLD** = `badman/libs/frontend/pages/competition/team-enrollment/` (Angular, legacy, not deployed)
> - **NEW** = `badman-frontend/components/pages/enrollment/` + `badman-frontend/app/[locale]/(authenticated)/enrollment/` (Next.js, deployed)
> - **BE** = `badman/libs/backend/competition/enrollment/` and the GraphQL resolvers under `badman/libs/backend/graphql/`

---

## Table of contents

- [0. TL;DR — what to fix or verify before shipping](#0-tldr--what-to-fix-or-verify-before-shipping)
- [1. Wizard structure](#1-wizard-structure)
- [2. Form fields per step](#2-form-fields-per-step)
  - [Step "club / general info"](#step-club--general-info)
  - [Step "locations"](#step-locations)
  - [Step "transfers / loans"](#step-transfers--loans)
  - [Step "team transfer" (OLD only)](#step-team-transfer-old-only)
  - [Step "teams" — per‑team form](#step-teams--perteam-form)
  - [Step "comments / remarks"](#step-comments--remarks)
- [3. Locations / venues](#3-locations--venues)
- [4. Team composition](#4-team-composition)
- [5. Index calculations (CRITICAL)](#5-index-calculations-critical)
  - [Backend reference (canonical formula)](#backend-reference-canonical-formula)
  - [OLD frontend](#old-frontend)
  - [NEW frontend](#new-frontend)
  - [Ranking snapshot date](#ranking-snapshot-date)
- [6. Validation rules engine](#6-validation-rules-engine)
- [7. Sub‑events / divisions / levels](#7-subevents--divisions--levels)
- [8. Captain & contact details](#8-captain--contact-details)
- [9. Comments / notes to admin](#9-comments--notes-to-admin)
- [10. GraphQL operations: side‑by‑side](#10-graphql-operations-sidebyside)
  - [Queries](#queries)
  - [Mutations](#mutations)
- [11. Edge cases / business rules](#11-edge-cases--business-rules)
  - [11.1 Minimum team count](#111-minimum-team-count)
  - [11.2 Cannot re‑submit](#112-cannot-resubmit)
  - [11.3 Locked transfers / loans](#113-locked-transfers--loans)
  - [11.4 `nationalCountsAsMixed`](#114-nationalcountsasmixed)
  - [11.5 Season handling](#115-season-handling)
  - [11.6 Single‑location auto‑select](#116-singlelocation-autoselect)
  - [11.7 Riser/faller auto‑pick](#117-riserfaller-autopick)
  - [11.8 `amountOfBasePlayers` is hard‑coded in NEW](#118-amountofbaseplayers-is-hardcoded-in-new)
  - [11.9 Orphan player detection](#119-orphan-player-detection)
- [12. State management](#12-state-management)
- [13. Submit flow (CRITICAL)](#13-submit-flow-critical)
  - [OLD](#old)
  - [NEW](#new)
  - [13.a `team.id` is a client‑generated UUID — not a server team](#13a-teamid-is-a-clientgenerated-uuid--not-a-server-team)
  - [13.b No `finishEventEntry`](#13b-no-finishevententry)
  - [13.c Other side‑effects missing](#13c-other-sideeffects-missing)
  - [Concrete proposed submit sequence for NEW](#concrete-proposed-submit-sequence-for-new)
- [14. Permissions](#14-permissions)
- [15. i18n](#15-i18n)
- [16. Summary tables](#16-summary-tables)
  - [Features in both](#features-in-both)
  - [Features only in OLD](#features-only-in-old)
  - [Features only in NEW](#features-only-in-new)
  - [Things to copy from OLD essentially as‑is](#things-to-copy-from-old-essentially-asis)
  - [Likely‑bug checklist for NEW (one‑line each)](#likelybug-checklist-for-new-oneline-each)

---

## 0. TL;DR — what to fix or verify before shipping

These are the items that, based on this audit, are most likely to be bugs or missing functionality in the new frontend. Each is expanded in the relevant section below.

1. **Base index is calculated incorrectly in NEW.** Missing rankings default to `0` instead of `12`, and there is no "missing player" penalty. The backend still uses `12` and adds `(4 − count) × 24/36`. Result: UI baseIndex differs from server baseIndex → wrong sub‑event filtering → potential validation rejections at submit. See §5.
2. **NEW never calls `finishEventEntry`.** The legacy flow ends with `finishEventEntry(clubId, email, season)`, which sets `sendOn`, mails the club, and records `LoggingAction.EnrollmentSubmitted`. NEW only calls `createEnrollment` per team. Without `finishEventEntry`, no email goes out, `sendOn` stays null, and the "already submitted" guard never trips. See §13.
3. **NEW submits client‑generated UUIDs as `teamId`** to a backend mutation that expects a real `Team.id`. Brand‑new teams never get persisted via `createTeams` in the new flow. Imported teams hold the original team's id in `link`, not in `id`. See §13 + §10.
4. **NEW does not persist `Availability`, `Comment` (per level), `Loan`/`Transfer` memberships, or `Team` rows.** All four are in‑memory only on the client. OLD persists them via dedicated mutations during save. See §3, §9, §10.
5. **`remarks` is collected but not sent anywhere.** The Yup schema captures it, but no GraphQL mutation references it. OLD writes one comment per LevelType (PROV / LIGA / NATIONAL) via `addComment`. See §9.
6. **`nationalCountsAsMixed` flag is gone in NEW.** The OLD wizard exposes a checkbox that affects how NATIONAL teams are numbered alongside MX teams; the backend `createTeams` mutation still accepts and uses this flag. See §11.
7. **Ranking snapshot date is not enforced on the client in NEW.** OLD limits `PlayerRanking` to `rankingDate <= moment([season, 5, 10])`; NEW reads `rankingLastPlaces[0]` (newest first). For mid‑season enrollment this can pull a ranking that is newer than the season cut‑off the backend uses. See §5.
8. **Continuity (`link`) propagation is partial.** Imported teams correctly set `link = previousTeamId`. New teams have no `link`, even when the user clearly intends to continue an existing one (no "team transfer" step exists). The backend `TeamRiserFallerRule` and `TeamContinuityRule` rely on `link` for promotion/demotion enforcement. See §3.

The remaining gaps below are mostly missing features (admin comments per level, locations capacity write‑back, transfer/loan persistence). None of those should silently corrupt data, but they will be visible to clubs the moment they try to enroll.

---

## 1. Wizard structure

|            | OLD                                                            | NEW                                                    |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Step count | **6**                                                          | **4**                                                  |
| Step 1     | Club selection (incl. contact email + `nationalCountsAsMixed`) | General information (club + locations + contact email) |
| Step 2     | Locations                                                      | Transfers & loans                                      |
| Step 3     | Player transfers / loans                                       | Teams                                                  |
| Step 4     | Team transfer (continuity carry‑over)                          | Remarks (free‑form)                                    |
| Step 5     | Teams & rosters                                                | —                                                      |
| Step 6     | Comments (per level: PROV / LIGA / NATIONAL)                   | —                                                      |
| UI         | Single page, `mat-stepper` (vertical)                          | One Next.js route per step, central `<Stepper>` widget |
| Routing    | Lazy module behind `AuthGuard`                                 | `(authenticated)` route group + `<EnrollmentGuard>`    |

**OLD step layout** — `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/team-enrollment.page.html`, defined as a Material vertical stepper with the six steps above. Module + route guard in `badman/libs/frontend/pages/competition/team-enrollment/src/team-enrollment.module.ts:12-16`:

```ts
canActivate: [AuthGuard],
data: {
  claims: ['[:id]_edit:enrollment-competition', 'edit-any:enrollment-competition'],
}
```

**NEW step layout** — `badman-frontend/components/pages/enrollment/navigation/enrollmentSteps.ts:18-34`:

```ts
{ id: 'general-information', path: '/enrollment/general-information', ... },
{ id: 'transfers-loans',     path: '/enrollment/transfers-loans',     ... },
{ id: 'teams',               path: '/enrollment/teams',               ... },
{ id: 'remarks',             path: '/enrollment/remarks',             ... },
```

**Side note — locations are now part of step 1.** OLD treats locations as their own step, with editable availabilities. NEW folds location _selection_ into step 1 but does not let the user edit location availabilities — those have to be set in `components/pages/club/edit/tabs/locations/` separately. This is a deliberate scope reduction; flag it in onboarding docs so clubs understand they need to set up game days before starting an enrollment.

---

## 2. Form fields per step

### Step "club / general info"

| Field                   | OLD                                                             | NEW                                                                                                                       | Notes                                                                                            |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `clubId`                | `clubControl`, required                                         | `clubId`, required, synced to `?clubId=` URL param                                                                        | NEW auto‑selects if user has exactly one editable club.                                          |
| `contactEmail`          | `emailControl`, required, defaults to `club.contactCompetition` | `contactEmail`, required (Yup `.email()`), defaults to `profile.email`                                                    | OLD pulls from club, NEW pulls from current user — different defaults. Confirm which is desired. |
| `nationalCountsAsMixed` | `nationalCountsAsMixedControl` (boolean, default `true`)        | **MISSING**                                                                                                               | See §11.4.                                                                                       |
| `season`                | derived from URL/season picker on the page                      | `season` field, default `currentYear` (with `// TODO` comment about correct season logic), teams use `CURRENT_SEASON + 1` | See §11.5.                                                                                       |

OLD: `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/components/steps/club/club.step.ts:97-99`
NEW: `badman-frontend/components/pages/enrollment/form/enrollmentSchema.ts:95-159`

### Step "locations"

OLD captures a full `FormArray` per club where each entry includes the venue + `availabilities[].days[]` (day, start, end, courts) + `availabilities[].exceptions[]`. The wizard creates / updates `Availability` rows (`badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/team-enrollment.page.ts:243-281`).

NEW only captures `locations[].locationId` and a derived snapshot of availabilities for use in step 3 (preferred day/time picker). It does **not** mutate `Availability` rows. See §3.

NEW location‑level validation (`badman-frontend/components/pages/enrollment/form/enrollmentSchema.ts:19-45`) requires that each picked location has at least one weekday with ≥ 2 courts AND ≥ 180 minutes:

```ts
function hasQualifyingGameday(availabilities) {
  // sums non-overlapping minutes per weekday across all rows for the location;
  // qualifies if any day has >= 2 courts and >= 180 minutes
}
```

OLD has no equivalent client‑side rule; it relied on the backend rules engine.

### Step "transfers / loans"

|                             | OLD                                       | NEW                                            |
| --------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Adds new club memberships   | Yes — `AddPlayerToClub` mutation per pick | **No mutation called.** Just a draft list.     |
| Locks confirmed memberships | Yes (`clubMembership.confirmed`)          | Same locking shown in UI, but only as a filter |
| Persists on submit          | Yes                                       | **No**                                         |

OLD: `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/team-enrollment.page.ts:297-375`
NEW: `badman-frontend/components/pages/enrollment/transfersLoansStep/`

This is a real feature gap. See §10 for which mutations are missing.

### Step "team transfer" (OLD only)

OLD has a dedicated step that lets the user link prior‑season teams to current‑season teams via `team.link` (`badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/components/steps/teams-transfer/teams-transfer.step.ts:79-93`). That step writes `link` onto the new team rows so that backend `TeamRiserFallerRule` and `TeamContinuityRule` can map promotions/demotions.

NEW has **no equivalent step**. The only path to a `link` is the import dialog in step "teams" (`teamsStep.utils.ts:88-89`):

```ts
return normalizeEnrollmentTeam({
  id: crypto.randomUUID(),
  link: team.id,                    // imported team's id becomes the link
  ...
});
```

Brand‑new teams created via "Add team" never get a `link`, which is technically correct only for genuinely new teams. The implication: there is no UI flow for "this team continues last year's third women's team but I want to renumber it" the way OLD allows. Worth flagging if continuity is important to BV.

### Step "teams" — per‑team form

| Field                             | OLD                                                                                 | NEW                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                              | server‑assigned via `createTeams`                                                   | client‑side `crypto.randomUUID()`                                                                                                  |
| `link`                            | set in dedicated team‑transfer step                                                 | set only when importing                                                                                                            |
| `name`                            | optional                                                                            | optional                                                                                                                           |
| `teamNumber`                      | computed by team‑transfer or user; respects `nationalCountsAsMixed`                 | required & unique per type (`enrollmentSchema.ts:141-156`); no NATIONAL/MX combined logic                                          |
| `type`                            | `M / F / MX / NATIONAL`                                                             | same                                                                                                                               |
| `players[]` (REGULAR + BACKUP)    | yes                                                                                 | yes                                                                                                                                |
| `basePlayers[]` (4 by default)    | yes — checked by backend `TeamMaxBasePlayersRule`                                   | yes — capped at `MAX_BASE_PLAYERS = 4` _unless `allowExcessBasePlayers` is true (only for imports)_                                |
| `backupPlayers[]`                 | yes                                                                                 | yes                                                                                                                                |
| `exceptions[]` (level exceptions) | yes (`levelExceptionRequested`, `levelExceptionReason` on `EntryCompetitionPlayer`) | exists in `EnrollmentTeam.exceptions` but I could not find a UI to populate it. It is always `[]` after `normalizeEnrollmentTeam`. |
| `subEventId`                      | required for submit                                                                 | optional in schema (`enrollmentSchema.ts`) — but `useSubmitEnrollment` filters teams without `subEventId` before submitting        |
| `captain`                         | `captainId`                                                                         | `captain: { id, fullName, memberId }`                                                                                              |
| `email`, `phone`                  | optional                                                                            | required in dialog (Yup `string().required().trim()`)                                                                              |
| `preferredDay`, `preferredTime`   | optional                                                                            | required in dialog                                                                                                                 |
| `preferredLocationId`             | optional, auto‑filled if club has one location                                      | optional                                                                                                                           |

OLD stores everything inside Angular `FormGroup` / `FormArray` and never persists until the explicit save. NEW uses `react-hook-form` + Yup and persists a draft to `localStorage` continuously (see §12).

### Step "comments / remarks"

|             | OLD                                                | NEW                        |
| ----------- | -------------------------------------------------- | -------------------------- |
| Granularity | one comment per LevelType (PROV / LIGA / NATIONAL) | one global `remarks` field |
| Persisted   | yes — `addComment` mutation per level              | **no mutation referenced** |
| Stored on   | `EventCompetition` (via `linkType: "competition"`) | nowhere                    |

OLD: `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/components/steps/comments/comments.step.ts:113-132`
NEW: `badman-frontend/components/pages/enrollment/remarksStep/RemarksStep.tsx:20-30`, `enrollmentSchema.ts:157`.

This is the most visible regression for admins, who use these comments as a way to flag exceptions to the federation.

---

## 3. Locations / venues

| Concern                                       | OLD                                                   | NEW                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Pick locations                                | `FormArray` of selectable club locations              | `LocationSelection` component, similar UX                                                                   |
| Edit availabilities (day, start, end, courts) | inline in this step                                   | **not in this flow** — must be done in the club edit page first                                             |
| Cascade prior‑season availability             | yes — copies last season's days, clears exceptions    | no                                                                                                          |
| Persist `Availability`                        | `CreateAvailability` / `UpdateAvailability` mutations | none                                                                                                        |
| Capacity validation                           | server‑side only                                      | client requires ≥ 2 courts AND ≥ 180 min on at least one weekday per location (`enrollmentSchema.ts:19-45`) |

NEW location persistence is missing because the data model already exists per club; clubs are expected to maintain it themselves elsewhere. This is a defensible product decision, but the wizard should make that explicit ("set up your game days at _Club → Edit → Locations_ first") to avoid clubs entering enrollment with no qualifying locations.

OLD cascade (`badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/service/team-enrollment.service.ts:231-247`) is worth porting if BV wants to keep "auto‑copy last season's gamedays" behaviour. If you decide to support editing availabilities from inside the new wizard, the OLD `CreateAvailability` / `UpdateAvailability` mutations are still on the backend; the GraphQL operations exist verbatim in `badman-frontend/graphql/clubs/mutations.gql`.

---

## 4. Team composition

Both versions:

- Filter the player picker by team type (`MX` accepts both genders, `M` / `F` filter accordingly).
- Distinguish `basePlayers` (REGULAR membership) from `backupPlayers` (BACKUP membership).
- Treat the captain as a separately‑set player ID per team.

Where they diverge:

1. **Base‑player count rule.** OLD does not enforce a hard cap client‑side; it relies on backend `TeamMaxBasePlayersRule` (which checks against `eventCompetition.meta.amountOfBasePlayers`, typically 4). NEW hard‑codes `MAX_BASE_PLAYERS = 4` (`addEnrollmentTeamSchema.ts:4`). If BV ever changes `meta.amountOfBasePlayers` to a non‑4 value (e.g. 6 in a youth league), NEW will silently reject valid configurations.
2. **`allowExcessBasePlayers` flag.** NEW relaxes the cap when a team is imported (i.e. has `link`). This exists because legacy teams sometimes had > 4 REGULAR players. Confirm this is intentional and documented for clubs.
3. **Pending players from step 2.** NEW lets you select transfers/loans drafted in the previous step as base players (`SelectBasePlayers.tsx:20-26`). OLD's player picker only knows about confirmed memberships. This is an improvement but introduces an "orphan" failure mode that NEW handles via `useBasePlayerIntegrity`:

```ts
// badman-frontend/components/pages/enrollment/teamsStep/useBasePlayerIntegrity.ts:29-58
// If a player was drafted as a transfer in step 2, then chosen as a base
// player in step 3, then the transfer was removed in step 2, the team
// references a non-existent player. Surfaces a client-side error.
```

This is a feature OLD does not have — and a good one.

---

## 5. Index calculations (CRITICAL)

This is the highest‑confidence bug in NEW.

### Backend reference (canonical formula)

`badman/libs/utils/src/lib/get-index.ts:18-65` — `getIndexFromPlayers(type, players, defaultRanking = 12)`:

```ts
// Non-MX (M, F):
//   - Take best 4 by (single + double)
//   - sum = Σ(single + double); missing rankings default to 12
//   - if fewer than 4 players: sum += (4 - count) × 24
//
// MX:
//   - Take best 2 males + best 2 females by (single + double + mix)
//   - sum = Σ(single + double + mix); missing rankings default to 12
//   - if fewer than 4 players: sum += (4 - count) × 36
```

Used both for `teamIndex` (over `team.players`) and `baseIndex` (over `team.basePlayers`) on the backend at `badman/libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts:210-211`.

### OLD frontend

OLD uses the exact same `getIndexFromPlayers` from `@badman/utils` (re‑exported into the Angular bundle). Computed reactively on team form changes (`teams/components/team/team.component.ts:136-160`). Therefore the value displayed in the UI matches what the backend will compute.

### NEW frontend

`badman-frontend/components/pages/enrollment/teamsStep/enrollmentTeamDialog.utils.ts:159-179`:

```ts
export function calculateBaseIndex(
  rankingByPlayerId: Map<string, PlayerRanking>,
  playerIds: string[],
  teamType?: string
): number {
  if (!playerIds || playerIds.length === 0) return 0;

  return playerIds.reduce((sum, playerId) => {
    const ranking = rankingByPlayerId.get(playerId);
    if (!ranking) return sum; // <-- (1) silently drop
    return sum + getPlayerTotalPoints(ranking.single, ranking.double, ranking.mix, teamType);
  }, 0);
}
```

And `badman-frontend/components/teamFormation/TeamFormationPageContent.utils.ts:143-155`:

```ts
export const getPlayerTotalPoints = (single, double, mix, teamType) => {
  const singleValue = single ?? 0; // <-- (2) default 0
  const doubleValue = double ?? 0; // <-- (2) default 0
  const mixValue = mix ?? 0; // <-- (2) default 0
  const isMix = teamType === API.ETeamType.MX;
  return singleValue + doubleValue + (isMix ? mixValue : 0);
};
```

Three independent divergences from the backend formula:

1. **Players with no ranking row are dropped silently** (`if (!ranking) return sum;`). Backend would still apply default 12 for that player, contributing 24 (or 36 for MX).
2. **Missing component rankings default to 0**, not 12. So a player ranked single=8 but with no double row contributes 8 instead of 8+12 = 20.
3. **No "missing player" penalty** at all. A team with 2 base players has its index summed straight; backend adds (4 − 2) × 24 = 48.

The discrepancy can easily be 50–150 points wide for a team with one or two unranked players. Concretely, an M team with 2 base players each ranked single=8, double=8, no mix:

|                        | OLD / Backend     | NEW        |
| ---------------------- | ----------------- | ---------- |
| Per‑player points      | 8 + 8 = 16        | 8 + 8 = 16 |
| Sum of selected        | 32                | 32         |
| Missing player penalty | (4 − 2) × 24 = 48 | 0          |
| **Final baseIndex**    | **80**            | **32**     |

The user, looking at NEW's UI, sees `baseIndex = 32` and is offered every sub‑event with `minBaseIndex ≤ 32`. They pick the strongest division they qualify for, hit submit, and the backend rejects with `team-to-week` because the real baseIndex is 80.

Worse: even when the team has its full 4 players, the `?? 0` fallback means a partially‑ranked player (e.g. single=8 but no double row at all) is undercounted.

**Recommended fix:** call `getIndexFromPlayers` from `@badman/utils` directly. The package is already a peer dependency. Alternatively port the same formula into a new util shared between front‑ and back‑end and write a property test that round‑trips against `getIndexFromPlayers`.

### Ranking snapshot date

OLD `PlayerRanking` query:

```graphql
# badman/libs/frontend/pages/competition/team-enrollment/.../team.component.ts:323-348
query PlayerRanking($where: JSONObject!, $order: [SortOrderType!]) {
  rankingPlaces(where: $where, order: $order, take: 1) {
    single
    double
    mix
  }
}
# variables.where = { playerId, systemId, rankingDate: { $lte: moment([season, 5, 10]) } }
```

That is, "give me the player's most recent ranking on or before May 10 of season year" — matching the backend cut‑off in `EnrollmentValidationService` (`enrollment.service.ts:147` uses the same date).

NEW `useBaseIndex.ts` reads `player.rankingLastPlaces[0]` from `GetClubPlayersDocument`, with no date filter (`useBaseIndex.ts:46`). Whatever the most recent ranking row is, that is what is used.

For mid‑season enrollment that is fine because the backend will recompute. For an early‑season enrollment (June/July) the difference is small. The bug surface is when a player's ranking changes between May 10 and the moment the user opens the form: NEW shows the new ranking, backend uses the May‑10 snapshot. Cheap fix: pass `lastRankingWhere: { systemId, rankingDate: { $lte: moment([season, 5, 10]) } }` into `GetClubPlayersDocument`.

---

## 6. Validation rules engine

Both frontends ultimately call the same backend operation: `enrollmentValidation(enrollment: EnrollmentInput)` in `badman/libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts:28-38`. The full rule list (run in this order — `enrollment.service.ts:341-359`) is:

```
PlayerCompStatusRule
PlayerBaseRule
PlayerGenderRule
PlayerMinLevelRule
PlayerSubEventRule
PlayerClubRule
TeamSubEventRule
TeamBaseIndexRule
TeamBaseGenderRule
TeamMaxBasePlayersRule
TeamRiserFallerRule
TeamSubeventIndexRule
TeamOrderRule
TeamContinuityRule
```

Each rule emits per‑team `errors[]` and `warnings[]` with i18n keys under `all.v1.entryTeamDrawer.validation.errors.*` / `.warnings.*`.

|                                  | OLD                                                                                                                            | NEW                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trigger                          | debounced 600 ms on team form change                                                                                           | debounced inside `useEnrollmentValidation` (see hook)                                                                                            |
| Renderer                         | `EnrollmentMessageComponent` (`badman/libs/frontend/components/src/enrollment-message/enrollment-message.component.ts:20-168`) | `TeamValidationMessages` + `useTranslateValidationError` (`badman-frontend/components/EventEntryTeamDrawer/sections/TeamEnrollmentValidations/`) |
| i18n namespace                   | `all.competition.team-enrollment.errors.*` (note: different path than backend keys; OLD has its own dictionary)                | `EntryTeamDrawer.*` matching backend keys                                                                                                        |
| Mixes client + server validation | minimal client checks, mostly server                                                                                           | yes — `EnrollmentValidationProvider` merges `useEnrollmentValidation` (server) and `useBasePlayerIntegrity` (client orphan detection)            |

**Discrepancy worth noting:** OLD uses a different i18n namespace than the backend keys imply. The OLD `EnrollmentMessageComponent` has its own per‑rule rendering logic and renames keys (look at the `switch (message)` in `enrollment-message.component.ts`). NEW uses the backend keys directly, which is the simpler and correct approach. Worth keeping NEW's design.

---

## 7. Sub‑events / divisions / levels

Backend filtering and rules:

- `SubEventCompetition.minBaseIndex` / `maxBaseIndex`: acceptable team base index range.
- `SubEventCompetition.maxLevel`: weakest player rank allowed (lower number = stronger). `PlayerMinLevelRule` enforces.
- `SubEventCompetition.levelWithModifier`: PROV × 10000, LIGA × 100, NATIONAL × 1. Used by `TeamRiserFallerRule` and `TeamOrderRule` for ordering.
- Riser/faller: previous‑season `Standing.riser` / `.faller` flags drive constraints on which sub‑event a continuing team may pick.

OLD frontend behaviours:

1. Filters available sub‑events to `[minBaseIndex, maxBaseIndex]` unless user has `enlist-any-event:team` claim. (`team-enrollment.component.ts:107`)
2. For continuing teams (`team.link`), auto‑suggests next season's sub‑event using `getNewTypeAndLevel` (`get-next-level.ts:3-44`):
   - Riser at PROV‑1 → LIGA bottom; LIGA‑1 → NATIONAL bottom; otherwise level − 1
   - Faller at NATIONAL → LIGA‑1; LIGA → PROV‑1; otherwise level + 1
3. Only shows events whose enrollment window is open (unless user has `enlist-any:team`).

NEW frontend behaviours:

1. Filters via `filterDivisionsByBaseIndex` (`enrollmentTeamDialog.utils.ts:113-124`) using the (potentially wrong, see §5) client‑side baseIndex. Falls back to "show all" if nothing matches (with a "range mismatch" warning) — `useDivisions.tsx:39-76`.
2. **No automatic riser/faller suggestion.** User picks manually.
3. Surfaces "player too strong for division" warning via `getPlayersExceedingMaxLevel` (`enrollmentTeamDialog.utils.ts:134-150`) — _this is a useful client‑side preview the OLD doesn't have_.
4. Open/close window enforcement appears server‑side only.

**Items to copy from OLD:** the riser/faller auto‑suggest in `get-next-level.ts` is small, isolated, and saves users a lot of confusion. It is one of the cleanest items to lift over.

---

## 8. Captain & contact details

|                                           | OLD                                                                                                 | NEW                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Captain                                   | `captainId` field, picked from team players; auto‑pulls captain's email/phone into team email/phone | `captain: { id, fullName, memberId }` object on team; required in dialog |
| Per‑team email                            | optional; warning if missing                                                                        | required (Yup `.required().trim()`)                                      |
| Per‑team phone                            | optional; warning if missing                                                                        | required (Yup `.required().trim()`)                                      |
| Per‑team `preferredDay`/`Time`/`Location` | optional; warning if missing                                                                        | required (Yup)                                                           |
| Validation severity                       | warnings (non‑blocking)                                                                             | errors (blocking)                                                        |

NEW is stricter than OLD — likely intentional, but worth confirming with BV. If a club has not yet decided on a captain at enrollment time, OLD lets them submit anyway and add the details later; NEW blocks submission. If you want to retain that flexibility, downgrade these to `.optional()` in the Yup schema.

OLD `checkTeam()` warning concatenation: `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/components/steps/teams/components/team/team.component.ts:268-318`.

---

## 9. Comments / notes to admin

|                                             | OLD                                                                  | NEW                                            |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Per‑level comments (PROV / LIGA / NATIONAL) | ✅                                                                   | ❌                                             |
| Per‑club global remark                      | ❌ (the OLD has nothing equivalent)                                  | ✅ (single `remarks` field, **not persisted**) |
| Per‑team comment                            | ❌                                                                   | ❌ (server validation messages instead)        |
| Persisted via                               | `addComment` mutation (`linkType: "competition"`, `linkId: eventId`) | nowhere                                        |
| Renderable to admin                         | yes — admin views show comments on `EventCompetition`                | no — `remarks` lives only in `localStorage`    |

OLD: `badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/team-enrollment.page.ts:214-230` for the mutation; load query in `service/queries/comments.ts:6-34`.

NEW: schema captures the field but `useSubmitEnrollment` does not pass it anywhere, and there is no `addComment` call in the enrollment flow.

The simplest fix that preserves the OLD admin experience: in step 4, allow the user to enter one comment per `EventCompetition.type` they have teams in (PROV / LIGA / NATIONAL). On submit, fan out an `AddComment` mutation per non‑empty comment with `{ clubId, linkId: eventId, linkType: "competition", message }`. The backend `addComment` resolver already supports the upsert semantics — `badman/libs/backend/graphql/src/resolvers/comment/comment.resolver.ts:51-119`.

If you want to preserve the new "single global remark" UX, you still need to send it somewhere. Possible options: store on `Club.metadata`, persist as a `Comment` with a new linkType, or pass it as a parameter to `finishEventEntry` (which the backend would log/notify alongside the email).

---

## 10. GraphQL operations: side‑by‑side

### Queries

| Purpose                                      | OLD                                                                        | NEW                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Load club                                    | `Club` (`service/queries/club.ts`)                                         | `GetClubsDocument` / `GetClubLocationsDocument`                      |
| Load club teams (for prior season + current) | `TeamsForSeason_${season}_${season+1}` (`service/queries/teams.ts:24-120`) | `GetClubTeamsDocument` (only via import dialog)                      |
| Load locations + availabilities              | `Locations` query (`service/queries/locations.ts:16-57`)                   | `GetClubLocationsDocument`                                           |
| Load events / sub‑events                     | `EventCompetition` (`service/queries/events.ts:36-58`)                     | `GetEventCompetitionsDocument`, `GetSubEventCompetitionsDocument`    |
| Load transfers / loans                       | `GetLoansAndTransfersForSeason${season}` (`service/queries/transfers.ts`)  | client‑side state only; reuses general player queries                |
| Load existing comments                       | `Comments` (`service/queries/comments.ts:15-23`)                           | none                                                                 |
| Validate enrollment                          | `ValidateEnrollment` (`service/queries/validate.ts:68-94`)                 | `ValidateEnrollmentDocument` (`graphql/enrollment/queries.gql:1-24`) |
| Player ranking lookup                        | `PlayerRanking` with date filter (`team.component.ts:323-348`)             | `GetClubPlayersDocument` + `rankingLastPlaces[0]` (no date filter)   |

### Mutations

| Purpose                                       | OLD                                                               | NEW                                                               |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Delete all current‑season teams (pre‑rebuild) | `DeleteTeams(clubId, season)` (`team-enrollment.page.ts:459-554`) | —                                                                 |
| Bulk‑create teams                             | `CreateTeams($teams, $nationalCountsAsMixed)`                     | —                                                                 |
| Create / update Availability                  | `CreateAvailability`, `UpdateAvailability`                        | —                                                                 |
| Add / remove player to club                   | `AddPlayerToClub`, `RemovePlayerFromClub`                         | — (used elsewhere in club admin pages, but not in enrollment)     |
| Add comment per level                         | `AddComment`                                                      | —                                                                 |
| Enroll team in sub‑event                      | (delegated via `entry` payload inside `CreateTeams`)              | `TeamEnrollmentDocument` → `createEnrollment(teamId, subEventId)` |
| Finalize submission                           | `FinishEvent` → `finishEventEntry(clubId, email, season)`         | —                                                                 |

The **only** mutation NEW fires during the actual submit is `createEnrollment` per team — see §13 for the consequences.

The backend supports every "missing" mutation above (they are still on the schema, see `badman-frontend/graphql/clubs/mutations.gql` and `badman/libs/backend/graphql/src/resolvers/event/entry.resolver.ts:120-172` for `finishEventEntry`). Wiring them up should be straightforward.

---

## 11. Edge cases / business rules

### 11.1 Minimum team count

OLD: validated by `minAmountOfTeams(1)` (`validators/one-team.validation.ts`).
NEW: validated by Yup at the `enrollmentSchema.ts:140` level (`validation.addAtLeastOneTeam`).
Both behave equivalently.

### 11.2 Cannot re‑submit

OLD checks `hadEntries` (any team with `entry.sendOn !== null`) and disables the buttons (`team-enrollment.page.html:50, 166-167`).
NEW has no such guard. Because NEW also never sets `sendOn` (no `finishEventEntry`), this condition would never trigger anyway. After §13 is fixed, port the OLD guard.

### 11.3 Locked transfers / loans

OLD: players whose `clubMembership.confirmed === true` are read‑only. NEW: equivalent filtering visible in transfer/loan rows. Behaviour matches.

### 11.4 `nationalCountsAsMixed`

OLD form has a checkbox (default `true`) that flows into the `createTeams` mutation: `CreateTeams($teams: [TeamNewInput!]!, $nationalCountsAsMixed: Boolean!)`. The backend uses this to renumber NATIONAL alongside MX teams.
NEW: missing entirely. If the new flow ends up persisting teams via `createTeams`, this flag must be reintroduced — otherwise a club with both an MX team and a NATIONAL team will get inconsistent numbering.

### 11.5 Season handling

OLD derives season from URL/season picker.
NEW defaults season to `new Date().getFullYear()` (`EnrollmentFormProvider.tsx:37`) but teams are always added with `season: CURRENT_SEASON + 1` (`useAddEnrollmentTeamForm.tsx:60`). There is a `// TODO` comment hinting this isn't finalized:

> `EnrollmentFormProvider.tsx:42` — `// TODO: figure out the right season for the form`

Two values can drift apart if the user opens the form straddling a season boundary. Fix before launch.

### 11.6 Single‑location auto‑select

OLD: if club has exactly one location, auto‑populate `prefferedLocationId` on the team (`team.component.ts:280-286`). NEW: not present. Cheap copy‑over.

### 11.7 Riser/faller auto‑pick

OLD `get-next-level.ts:3-44`. NEW: missing. See §7.

### 11.8 `amountOfBasePlayers` is hard‑coded in NEW

OLD respects `subEvent.eventCompetition.meta.amountOfBasePlayers` indirectly via the backend rule. NEW hard‑codes 4. See §4.1.

### 11.9 Orphan player detection

NEW only — `useBasePlayerIntegrity` flags base players that reference a transfer/loan that has been removed from step 2 since selection. OLD doesn't have this because step 2/3 are different shapes there.

---

## 12. State management

|                   | OLD                                                       | NEW                                                                                                           |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Library           | `signalSlice` (ngxtension) over RxJS, with action sources | `react-hook-form` + Yup, plus `EnrollmentValidationContext`                                                   |
| Source of truth   | the `signalSlice` store                                   | the form context                                                                                              |
| Draft persistence | none (in‑memory only, lost on reload)                     | `localStorage` key `enrollment-draft:v1:{clubId}`, debounced 400 ms (`EnrollmentFormProvider.tsx:195-203`)    |
| Hydration         | reload from server queries                                | merge `localStorage` draft with fresh `GetClubLocations` data on mount (`EnrollmentFormProvider.tsx:156-191`) |
| URL state         | none (single page)                                        | `?clubId=` query param synced (`ClubSelection.tsx:56-61`)                                                     |
| Cleanup           | `clear()` on component destroy                            | `clearEnrollmentDraft(clubId)` (manual, also after successful submit per typical flow)                        |

NEW's draft auto‑save is a clear UX upgrade and worth keeping. Watch for two failure modes:

1. **Stale draft after schema migration.** Bumped from `v1` is the only versioning. If you change `EnrollmentTeam` shape, old drafts will break Yup. The `normalizeEnrollmentTeam` function (`teamsStep.utils.ts:139-156`) helps with one rename (`prefferedLocationId` → `preferredLocationId`) but is the only migration in place. Consider adding a discriminator and a defensive parse on hydrate.
2. **Cross‑device drift.** Draft lives in localStorage, not in the DB, so a club captain switching devices loses progress. OLD doesn't have this either, so this is a regression‑neutral thing.

---

## 13. Submit flow (CRITICAL)

### OLD

`badman/libs/frontend/pages/competition/team-enrollment/src/pages/team-enrollment/team-enrollment.page.ts:189-446`. The `saveAndFinish()` method runs in this order:

```
1. save(includeTeams=true) — persists everything:
   a) Locations + Availabilities → CreateAvailability / UpdateAvailability
   b) Transfers + Loans          → AddPlayerToClub / RemovePlayerFromClub
   c) Comments per level         → AddComment per level
   d) Teams                      → DeleteTeams(clubId, season) THEN
                                   CreateTeams(teams[], nationalCountsAsMixed)
                                   (each team's input contains its sub-event,
                                   meta.competition.players, captain, etc.)
2. finishEventEntry(clubId, email, season)
   — backend sets sendOn, updates Club.contactCompetition,
     calls notifyEnrollment, logs LoggingAction.EnrollmentSubmitted.
3. Snackbar success → router.navigate(['/club', clubId])
```

The "delete + recreate" pattern is intentional: it lets `CreateTeams` accept the entire enrollment state as a single graph and have the server compute team numbers (using `nationalCountsAsMixed`).

### NEW

`badman-frontend/components/pages/enrollment/remarksStep/useSubmitEnrollment.ts:20-75`:

```ts
const submit = useCallback(
  async (teams) => {
    const eligible = teams.filter((t) => t.id && t.subEventId);
    if (!eligible.length) return { succeeded: [], failed: [] };

    const results = await Promise.allSettled(
      eligible.map((team) =>
        createEnrollment({ variables: { teamId: team.id, subEventId: team.subEventId } })
      )
    );
    // ... bookkeeping
  },
  [createEnrollment]
);
```

i.e. for each team in the form:

- Call `createEnrollment(teamId, subEventId)`. That's it.

Open issues, in roughly order of severity:

#### 13.a `team.id` is a client‑generated UUID — not a server team

`AddEnrollmentTeamDialog.tsx:121`:

```ts
const teamId = isEditing ? editTeam.id : crypto.randomUUID();
```

`teamsStep.utils.ts:88-89` (when importing):

```ts
return normalizeEnrollmentTeam({
  id: crypto.randomUUID(),
  link: team.id,                  // <-- the actual existing Team.id
  ...
});
```

So the `id` we send to the backend is _always_ a fresh UUID. The backend `createEnrollment` resolver does:

```ts
// badman/libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts:40-164
const team = await Team.findByPk(teamId, { transaction });
if (!team) {
  return { ... reason: TEAM_NOT_FOUND };
}
```

Therefore every team submitted via NEW will get `TEAM_NOT_FOUND` — both new teams (no backing record at all) and imported teams (backing record exists but its id is in `link`, not in the submitted `teamId`).

**Fix sketch:**

- For _imported_ teams (have `link`): send `teamId: team.link` to `createEnrollment` (or change the resolver to accept either).
- For _new_ teams: first call a `createTeam` mutation to materialize the row, capture the real `id`, then call `createEnrollment` with that id. Or — simpler — bring back OLD's `DeleteTeams` + `CreateTeams` pair and let the server return the IDs.

#### 13.b No `finishEventEntry`

The legacy flow ends with `finishEventEntry(clubId, email, season)`:

```ts
// badman/libs/backend/graphql/src/resolvers/event/entry.resolver.ts:120-172
@Mutation(() => Boolean)
async finishEventEntry(@Args('clubId') clubId, @Args('email') email, @Args('season') season) {
  // sets entry.sendOn = new Date() for every entry of every team in this club for this season
  // updates club.contactCompetition if changed
  // calls notificationService.notifyEnrollment(...)  → push + email via ClubEnrollmentNotifier
  // logs LoggingAction.EnrollmentSubmitted
}
```

NEW never calls this. Therefore:

- No confirmation email is sent to the contact email.
- No push notification is sent ("Club Inschrijving" toast).
- No `sendOn` timestamp on any entry — which means the OLD's "you've already submitted" guard would never fire if you ported it.
- No audit log entry.

If `finishEventEntry`'s contract is exactly the same as it was, wiring it up at the end of `useSubmitEnrollment` is a one‑liner once 13.a is resolved.

#### 13.c Other side‑effects missing

`remarks` (§9), location availabilities (§3), transfers/loans (§2), and `nationalCountsAsMixed` (§11.4) are all collected but never persisted. From a backend perspective the enrollment is "naked" compared to OLD's submission.

### Concrete proposed submit sequence for NEW

```ts
// pseudo-code, mirrors OLD's order
async function saveAndFinish(form) {
  const { clubId, season, locations, transfers, loans, teams, remarks, contactEmail } = form;

  // 1. Persist availabilities (if you decide to expose this in the wizard)
  await Promise.all(locations.flatMap(persistAvailability));

  // 2. Persist transfers/loans
  await Promise.all([
    ...transfers.map(addPlayerToClub),
    ...loans.map((p) => addPlayerToClub(p, "LOAN")),
  ]);

  // 3. Replace teams: delete then create (matches OLD)
  await deleteTeams({ clubId, season });
  const created = await createTeams({ teams: toTeamNewInput(teams), nationalCountsAsMixed: true });
  // map created.id back into form.teams so subsequent steps can reference real ids

  // 4. Comments per level
  await Promise.all(commentsPerLevel(remarks).map(addComment));

  // 5. Enroll each team in its sub-event (backend may do this inside createTeams; verify)
  // NB: in OLD this is part of CreateTeams via team.entry.subEventId

  // 6. Finalize
  await finishEventEntry({ clubId, email: contactEmail, season });
}
```

The exact split between "create teams" and "create enrollments" depends on whether `CreateTeams` already creates the `EventEntry` rows for you (it does in OLD — the input includes `entry.subEventId` and `entry.meta.competition.players`). Verify by reading the `createTeams` resolver and decide whether NEW should keep its per‑team `createEnrollment` calls at all.

---

## 14. Permissions

|                                              | OLD                                                                                            | NEW                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Route guard                                  | `AuthGuard` requiring `[:id]_edit:enrollment-competition` OR `edit-any:enrollment-competition` | `EnrollmentGuard` requiring `view:enrollment-competition` AND (`edit-any:club` OR `{clubId}_edit:club`) |
| "Enlist any event" override                  | `enlist-any-event:team` claim bypasses index filtering on sub‑events                           | not implemented                                                                                         |
| "Enlist any season" override                 | `enlist-any:team` claim shows events outside the open window                                   | not implemented                                                                                         |
| Server‑side enforcement (`createEnrollment`) | `edit:competition` OR `{clubId}_edit:club` OR `edit-any:club`                                  | same backend; same enforcement                                                                          |

NEW's permission set is slightly broader on the page (includes `view:enrollment-competition`) but narrower on the team form (no "enlist any event" claim → admins cannot pick out‑of‑range divisions through the new wizard). Worth confirming whether any BV admin uses this override.

---

## 15. i18n

OLD keys live under `all.competition.team-enrollment.*` (page chrome) and `all.v1.entryTeamDrawer.validation.*` (server messages, resolved by `EnrollmentMessageComponent`).

NEW keys live under `all.v1.enrollment.*` (page chrome — `enrollmentSteps.ts`, `enrollmentSchema.ts`) and `EntryTeamDrawer.*` (server validation messages, via `useTranslateValidationError`).

The validation key namespaces converge on `EntryTeamDrawer.*`/`entryTeamDrawer.*`, but the UI namespace was renamed (`team-enrollment` → `enrollment`). When porting any text from OLD, expect to relocate keys and re‑translate. Sample keys to be aware of:

- Page: `enrollment.steps.generalInformation`, `enrollment.steps.teams`, `enrollment.summary.title`.
- Validation: `enrollment.validation.addAtLeastOneTeam`, `enrollment.validation.duplicateTeamNumberSameType`, `enrollment.validation.locationGameDayAvailability`.
- Backend errors (rendered by both): `entryTeamDrawer.validation.errors.player-min-level`, `entryTeamDrawer.validation.errors.team-to-strong`, `entryTeamDrawer.validation.warnings.missing-continuity-link`, …

Both renderers receive the `params` object from the server unchanged and inject them into the translation. If you decide to drop OLD's `EnrollmentMessageComponent`'s custom `switch` and let `useTranslateValidationError` handle everything, you keep things consistent.

---

## 16. Summary tables

### Features in both

- Pick a club, select a contact email.
- Pick locations from the club's location list.
- Distinguish base / backup players, support exceptions metadata on team.
- Filter sub‑events by base index range.
- Send the entire draft to the backend `enrollmentValidation` query, render per‑team errors and warnings.
- Per‑team captain, contact email, contact phone (with different severity — see §8).

### Features only in OLD

- Editing per‑location availabilities (days, time slots, courts, exceptions) inline in the wizard, with create/update mutations.
- Persisting transfers and loans via `AddPlayerToClub` / `RemovePlayerFromClub`.
- Explicit "team transfer" step that maps prior‑season teams to current‑season teams (`team.link`).
- Auto‑suggest sub‑event for continuing teams via riser/faller logic (`get-next-level.ts`).
- Comments per LevelType (PROV / LIGA / NATIONAL) persisted via `addComment`.
- `nationalCountsAsMixed` toggle.
- Single‑location auto‑select for `prefferedLocationId`.
- "Already submitted" guard (`hadEntries`).
- `enlist-any-event:team` / `enlist-any:team` admin overrides.
- `finishEventEntry` finalisation: `sendOn`, audit log, push + email notifications.

### Features only in NEW

- LocalStorage draft autosave (with `?clubId=` URL state).
- Client‑side location capacity rule (≥ 2 courts AND ≥ 180 min on at least one weekday per location).
- Orphan‑player detection when a transfer/loan is removed after being chosen as a base player.
- "Player too strong for chosen division" warning before submit (`getPlayersExceedingMaxLevel`).
- Strict requiredness of captain / email / phone / preferredDay / preferredTime in the team dialog.
- Pending players (drafted transfers) selectable as base players in step 3.

### Things to copy from OLD essentially as‑is

- `getIndexFromPlayers` (`badman/libs/utils/src/lib/get-index.ts:18-65`) — _use this directly to fix §5_.
- Riser/faller auto‑level pick (`get-next-level.ts:3-44`).
- `hadEntries`/already‑submitted guard (after `finishEventEntry` is wired up).
- The submit pipeline shape (delete → bulk create → finalize).
- The per‑level admin comments behaviour (one mutation per level on submit).
- Single‑location auto‑select.
- The `nationalCountsAsMixed` flag plumbing.

### Likely‑bug checklist for NEW (one‑line each)

- [ ] Base index defaults missing rankings to `0` instead of `12` and skips the `(4 − count) × 24/36` penalty (§5).
- [ ] `useBaseIndex` reads `rankingLastPlaces[0]` without the May‑10 cut‑off (§5).
- [ ] `team.id` submitted to `createEnrollment` is a client UUID, not a real `Team.id` (§13.a).
- [ ] `finishEventEntry` is never called → no email, no `sendOn`, no audit (§13.b).
- [ ] `remarks` value never leaves the browser (§9).
- [ ] `MAX_BASE_PLAYERS` is hard‑coded to 4; backend uses `eventCompetition.meta.amountOfBasePlayers` (§4.1).
- [ ] `nationalCountsAsMixed` removed; if persisting teams via the new flow, NATIONAL/MX numbering will diverge from OLD (§11.4).
- [ ] `season` field defaults inconsistent between `EnrollmentFormProvider` and the team dialog (§11.5).
- [ ] No "already submitted" guard (§11.2 — only relevant after §13.b is fixed).
- [ ] No riser/faller auto‑suggest, so a continuing team can be silently placed in a division the backend will later reject under `TeamRiserFallerRule` (§7).

---

_End of document._
