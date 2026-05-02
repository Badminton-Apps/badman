# Quickstart: finishEventEntry Hardening

Local verification checklist for the backend change. Assumes `npm run docker:up` already running.

## 1. Build the affected lib

```bash
nx build backend-graphql
```

## 2. Run the new resolver spec

```bash
npx jest --config libs/backend/graphql/jest.config.ts \
  libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts
```

Expected: all 12 cases (R7 in `research.md`) pass; suite under 5 s.

## 3. Serve the API and exercise the GraphQL playground

```bash
nx serve api
```

Open `http://localhost:5010/graphql`. Run the three terminal-outcome cases against a seeded club + season.

### 3.a Fresh finalisation (happy path)

```graphql
mutation FreshFinalise {
  finishEventEntry(clubId: "<clubId>", season: 2026, email: "comp@club.test") {
    success
    alreadyFinalised
    notificationDispatched
  }
}
```

Expected: `{ success: true, alreadyFinalised: false, notificationDispatched: true }`. Inspect:
- `system.Loggings` has one new row with `action = 'EnrollmentSubmitted'` and matching `meta`.
- Every `event.EventEntries.sendOn` for the club's teams in 2026 is non-null.
- `Clubs.contactCompetition` reflects the supplied email.

### 3.b Idempotent re-submit

Run the mutation a second time with identical args.

Expected: `{ success: true, alreadyFinalised: true, notificationDispatched: false }`. Inspect:
- No new `Loggings` row.
- No `sendOn` timestamps changed (compare timestamps).
- No mail dispatched (check the mail service log / fake transport).

### 3.c Zero-team rejection

Pick a club+season pair with no `Team` rows.

Expected: `errors[0].extensions.code === "NO_TEAMS_TO_FINALISE"` with `clubId` and `season` echoed in `extensions`. No DB writes.

## 4. Lint + format

```bash
nx lint backend-graphql
prettier --check libs/backend/graphql/src/resolvers/event/
```

## 5. Affected tests

```bash
nx affected:test
```

Should be green. If not, the change touched something outside the documented surface — investigate before pushing.
