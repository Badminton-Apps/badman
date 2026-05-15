# ✅ Requirements

*Consolidated requirements for the Twizzit ↔ Badman integration, drawn from the analysis pages, meeting notes, and the API exploration. Each requirement is tagged so we can trace decisions back. MUST = ship-blocking for v1. SHOULD = strongly desired in v1, can slip with explicit sign-off. MAY = nice to have / future.*

## Functional requirements

### F1. Authentication & access

- **F1.1 (MUST)** — The sync authenticates against Twizzit using credentials managed by Badminton Vlaanderen, obtains a JWT, and presents it as `Authorization: Bearer <token>` on every subsequent call.
- **F1.2 (MUST)** — The sync resolves the organisation id at startup via `GET /organizations` and supplies it as `organization-ids[]` on every other call. It must not assume a hard-coded id.
- **F1.3 (MUST)** — Credentials are stored as environment-managed secrets (1Password → deploy env), never committed.
- **F1.4 (SHOULD)** — Token refresh: on `401`, re-authenticate once and retry; if it fails again, surface the error.

### F2. Player ingestion

- **F2.1 (MUST)** — Every Twizzit contact relevant to the federation is reconcilable to one and only one Badman `Player`.
- **F2.2 (MUST)** — The Player schema gains a persistent, indexed `twizzitId` field (Twizzit `contact.id`). All future matching uses this as the primary external key.
- **F2.3 (MUST)** — The existing `memberId` (federation/[toernooi.nl](http://toernooi.nl) id, sourced from Twizzit `extra-field-values → "Member ID"`) is preserved and kept consistent with Twizzit on every sync.
- **F2.4 (MUST)** — First-name + last-name + date-of-birth uniqueness is enforced in Badman, mirroring Twizzit's own uniqueness rule, to prevent reintroducing duplicates.
- **F2.5 (MUST)** — Player attributes synced from Twizzit on each tick: `firstName`, `lastName`, `dateOfBirth`, `gender`. (Email/phone/address are out of scope for v1.)
- **F2.6 (SHOULD)** — Existing duplicate players in Badman are merged or de-duplicated as part of this work, so the integration leaves the database cleaner than it found it.

### F3. Club membership ingestion

- **F3.1 (MUST)** — Every Twizzit `Membership` (filtered to types in scope, see F4) becomes or updates a `ClubPlayerMembership` in Badman, keyed on `twizzitId` (membership) for idempotent upsert.
- **F3.2 (MUST)** — `start-date`, `end-date`, `club-id` (resolved via Twizzit club id → Badman Club), and membership type are reflected exactly as Twizzit returns them.
- **F3.3 (MUST)** — A membership ending in Twizzit (end-date set or membership absent on subsequent sync) closes the membership in Badman; it does **not** delete history.
- **F3.4 (MUST)** — Loan memberships are layered on top of the player's home-club membership (separate `ClubPlayerMembership` of type Loan), reflecting Twizzit's model.
- **F3.5 (SHOULD)** — Club records themselves are also reconciled (matched by Twizzit club id and name); changes are rare but should not break the sync.

### F4. Membership types

- **F4.1 (MUST)** — Badman replaces the binary `competitionPlayer: bool` with a richer membership-type representation that can express at least: Competitive, Recreative, Youth, Loan, Non-player, Trial, Unbound summer player.
- **F4.2 (MUST)** — Membership types are pulled from `GET /membershipTypes` and cached as reference data; new types appearing in Twizzit must not crash the sync.
- **F4.3 (MUST)** — Eligibility logic (who can be added to which competition / encounter) is derived from membership type, not from a single boolean.

### F5. Sync cadence & freshness

- **F5.1 (MUST, conditional)** — Once Twizzit ships a `last-modified` filter, the sync runs every **15–30 minutes** and pulls only deltas.
- **F5.2 (MUST, fallback)** — Until that filter ships, the sync runs at a low cadence (e.g. nightly) doing a bounded, paginated full pull — and the team coordinates with Twizzit on rate limits before turning it on.
- **F5.3 (SHOULD)** — The cadence is database-driven (existing `system.CronJobs` table) so ops can adjust it without redeploy.

### F6. Idempotency, ordering & safety

- **F6.1 (MUST)** — Every sync run is idempotent: running it twice on the same Twizzit state must produce the same Badman state.
- **F6.2 (MUST)** — The sync never deletes a Player record. End-of-life is modelled by closing memberships; player records are retained for historical games.
- **F6.3 (MUST)** — Errors on individual records do not abort the run; they're logged with enough context to investigate and the run continues.
- **F6.4 (SHOULD)** — A failed sync is automatically retried by the existing retry mechanism mentioned in the 12/03/2026 sprint meeting.

### F7. Observability

- **F7.1 (MUST)** — Each run logs: start/end timestamps, organisation id used, count of records pulled, count created vs updated vs skipped, count of errors, and a sample of error messages.
- **F7.2 (SHOULD)** — Metrics for created-vs-found ratio per run — a sudden spike in "created" is the canary for a broken match key.
- **F7.3 (SHOULD)** — An alert fires when consecutive runs fail or when the duplicate-detection ratio crosses a threshold.

### F8. Dependency on legacy sync paths

- **F8.1 (MUST)** — The legacy `competition-sync/processors/player.ts`, `tournament-sync/processors/player.ts`, and `sync-ranking/ranking-sync.ts` paths that currently *create* players when not found must be reviewed. Once Twizzit is the source of truth, those paths must either stop creating players or create them in a way that is reconcilable on the next Twizzit sync.
- **F8.2 (SHOULD)** — Name-based fallback matching is removed or gated behind a feature flag once Twizzit linkage is established.

## Non-functional requirements

### N1. Performance & rate limits

- **N1.1 (MUST)** — The sync respects Twizzit's published rate limits and degrades gracefully (back-off + retry) on `429`.
- **N1.2 (MUST)** — A single run with a `last-modified` filter completes well within the cadence interval (target: < 5 minutes for typical delta).
- **N1.3 (SHOULD)** — Bulk endpoints (e.g. `/memberships`) are paginated correctly and never load the full federation into memory.

### N2. Reliability

- **N2.1 (MUST)** — Network errors, partial responses, and Twizzit downtime do not corrupt Badman state — the run either commits cleanly or is rolled back / no-ops.
- **N2.2 (SHOULD)** — The integration tolerates a Twizzit outage of up to 24 hours without manual intervention beyond "resume schedule when Twizzit is back".

### N3. Maintainability & extensibility

- **N3.1 (MUST)** — Twizzit-specific code lives in its own module/library so a future federation that doesn't use Twizzit can plug in a different membership source without rewriting Badman's core domain.
- **N3.2 (SHOULD)** — Membership-type mapping is configuration-driven, not hard-coded — ditto club-type categorisation (Competitieclub vs Recreantenclub).

### N4. Security & data protection

- **N4.1 (MUST)** — No Twizzit credentials or tokens appear in logs.
- **N4.2 (MUST)** — Personal data fetched from Twizzit (name, DoB, gender, contact info that we do store) is treated under the same GDPR posture as the rest of Badman.

### N5. Localisation

- **N5.1 (SHOULD)** — Membership type display in Badman uses Twizzit's localised names (EN/NL/FR) where shown to users.

## Release / acceptance criteria

- **A1** — Full federation imports cleanly into a staging Badman without producing duplicate players (matched against the existing dataset by `memberId`).
- **A2** — A change made in Twizzit (new member, type upgrade, transfer, loan, end of membership) is reflected in staging Badman within one sync interval.
- **A3** — Re-running the sync immediately after a successful run is a no-op on the database.
- **A4** — Existing duplicates in production Badman are reduced (target tracked in a follow-up dashboard, not a blocker for v1 cutover but a v1.1 deliverable).
- **A5** — Rollback plan exists: the sync can be paused via the cron job entry and Badman keeps functioning on the last good state.

## Source attribution

- Business goals & lifecycle rules: *Sync on Twizzit integration* (18/11/2025).
- Technical access pattern, auth, org id rule: *Twizzit x Badman Sync* (19/06/2025) and *Technical Analysis*.
- Data shapes, extra-field semantics: *API exploration* and its sub-pages.
- Duplicate-data context and existing sync paths: *NEW FEATURE Twizzit integration* / *Badman – Twizzit integration meeting* (25/07/2025).
- Cron job mechanics: *⏱️ Cron Jobs ⏱️*.