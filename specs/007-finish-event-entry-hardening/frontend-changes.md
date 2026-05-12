# Frontend Migration Notes — finishEventEntry Hardening

This document enumerates every frontend-visible change shipped by the backend feature
[007-finish-event-entry-hardening](spec.md). It is the hand-off checklist for the
sibling frontend repo (`badman-frontend`, Next.js) and, where still applicable, for
the legacy Angular SPA inside this monorepo.

**Compatibility level**: BREAKING. Coordinated release required — backend PR cannot
merge to `develop` until the frontend PR(s) consuming the new shape are open and
green.

---

## 1. Mutation return type changes from `Boolean!` to `FinishEventEntryResult!`

**Before**:

```graphql
mutation FinishEvent($clubId: ID!, $email: String!, $season: Int!) {
  finishEventEntry(clubId: $clubId, email: $email, season: $season)
}
```

The mutation field returned `Boolean!`. Generated TS type:
`Mutation['finishEventEntry']: boolean`.

**After**:

```graphql
mutation FinishEvent($clubId: ID!, $email: String!, $season: Int!) {
  finishEventEntry(clubId: $clubId, email: $email, season: $season) {
    success
    alreadyFinalised
    notificationDispatched
  }
}
```

Generated TS type: `Mutation['finishEventEntry']: { success: boolean; alreadyFinalised: boolean; notificationDispatched: boolean }`.

**Frontend action**:
- Update the `.graphql` document to select the three subfields.
- Re-run codegen (`yarn codegen` in `badman-frontend`; `nx run badman:codegen` in the legacy SPA if still wired).
- Replace any `if (data.finishEventEntry)` boolean check with field access.

---

## 2. New terminal outcomes the UI must handle

| Backend result | Meaning | Suggested UX |
|----------------|---------|--------------|
| `{ success: true, alreadyFinalised: false, notificationDispatched: true }` | Fresh finalisation, confirmation email/push sent. | Show "Submission complete — confirmation sent to {email}". |
| `{ success: true, alreadyFinalised: false, notificationDispatched: false }` | DB committed but notification dispatch failed. | Show "Submission complete — confirmation email could not be sent. Retry?" Offer a button that re-calls `finishEventEntry` (the backend will hit the idempotent path on retry — see #3). |
| `{ success: true, alreadyFinalised: true, notificationDispatched: false }` | Already submitted. | Show "Already submitted" terminal state. Disable the submit CTA. |

**Frontend action**: replace any single boolean branch with the three-way split above.
The legacy Angular wizard's "submitted!" toast logic must be widened.

---

## 3. Backend is now idempotent on re-submit

Re-calling `finishEventEntry` for an already-finalised `(clubId, season)` is now safe:
no duplicate email, no duplicate audit row, no `sendOn` overwrite. The frontend's
"already submitted" guard (BAD-122) becomes a UX nicety rather than a correctness
requirement.

**Frontend action**:
- The retry button suggested in #2 can call the mutation directly without a
  pre-flight check.
- The wizard-load guard (`hadEntries` flag from BAD-122) should now treat
  `alreadyFinalised: true` returned from a submit attempt as authoritative — if it
  comes back true, the wizard is already done, regardless of what the load-time
  guard said.

---

## 4. New email-update side-effect on the no-op path

When the user re-submits with a `email` arg that differs from the stored
`Club.contactCompetition`, the backend updates the club's contact email **even on
the `alreadyFinalised: true` path**. No notification is sent and no audit row is
written. The new email persists.

**Frontend action**: nothing required, but be aware that:
- Cached `Club.contactCompetition` in Apollo cache may go stale after a re-submit
  attempt. Add `Club` to the mutation's `refetchQueries` / `update` callback if
  the wizard or club-settings page reads `contactCompetition` afterwards.
- If the product team prefers the email NOT change on the no-op path, raise it now
  — current spec deliberately allows this (clarification recorded in
  [spec.md](spec.md#clarifications)).

---

## 5. New error code: `NO_TEAMS_TO_FINALISE`

Submitting a `(clubId, season)` that has zero `Team` rows now throws a
`GraphQLError` with `extensions.code === "NO_TEAMS_TO_FINALISE"` and
`extensions: { clubId, season }`.

**Frontend action**:
- Add `NO_TEAMS_TO_FINALISE` to the existing extensions-code-to-translation-key
  map (in `badman-frontend`: alongside `extensionsCodeMapForCreateEnrollment` in
  `useTranslateValidationError`).
- Add a translation key in all three locales via the `translation-manager` agent
  (do NOT hand-edit `all.json`). Suggested key path:
  `all.v1.enrollment.error.noTeamsToFinalise`.
- Wizard logic that gates the submit CTA on team count should already prevent
  this case from reaching the backend; treat it as a defensive backend guard only.

---

## 6. Notification failure no longer rolls back the database

Previously, a notification-service failure would surface as a thrown
`GraphQLError` (and confusingly leave half-written `sendOn` timestamps from the
pre-failure loop iterations). Now, DB writes commit first; the notification
attempt happens after commit; failure surfaces as `notificationDispatched: false`,
not as a thrown error.

**Frontend action**: remove any code path that treats a thrown
`finishEventEntry` error as "the submission probably half-succeeded — refresh
to find out". The new contract makes this unambiguous.

---

## 7. Permission and not-found errors unchanged

- Lacking `{clubId}_edit:club` / `edit-any:club` still produces a thrown error.
  The backend error class is `UnauthorizedException` (NestJS) but the GraphQL
  error code is `PERMISSION_DENIED` (existing constant). No frontend change.
- Unknown `clubId` still produces a thrown error mapping to `CLUB_NOT_FOUND`.
  No frontend change.

---

## 8. Schema diff (TL;DR)

```diff
-extend type Mutation {
-  finishEventEntry(clubId: ID!, email: String!, season: Int!): Boolean!
-}
+type FinishEventEntryResult {
+  success: Boolean!
+  alreadyFinalised: Boolean!
+  notificationDispatched: Boolean!
+}
+
+extend type Mutation {
+  finishEventEntry(clubId: ID!, email: String!, season: Int!): FinishEventEntryResult!
+}
```

New error code added to clients' classified-error catalog: `NO_TEAMS_TO_FINALISE`.

---

## 9. Coordinated rollout

1. Backend PR opens against `develop` with this spec, plan, and implementation.
2. Frontend PR(s) open in `badman-frontend` (and, if still actively serving the
   wizard, `apps/badman/`) with the document update + codegen + UX branching from
   sections 1–5 above.
3. Both PRs reference each other in their description.
4. Merge order: backend merges first to `develop` (the schema change does not
   affect a deployed environment until both repos rebuild). Frontend merges
   immediately after.
5. Sanity-check: hit each of the three terminal outcomes (quickstart §3.a–c)
   from a deployed preview before marking BAD-122 done.
