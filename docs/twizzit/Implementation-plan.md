# 🗝️ Implementation plan

*Phased plan, no code or schema specifics. The goal is to make the sequencing, dependencies, and decision points legible. Detailed schema/module design happens inside Phase 1.*

## Guiding principles

- **Twizzit becomes the system of record for member identity & memberships** — every other sync path ([toernooi.nl](http://toernooi.nl), ranking sync, manual import) must defer to it once cut over.
- **Idempotent, observable, replaceable.** Every sync run must be safe to re-run. Every run must be auditable. The Twizzit-specific module must be swappable for a future federation that doesn't use Twizzit.
- **No deletes.** Players are never destroyed; lifecycle is modelled by membership state.
- **Ship the smallest thing that's actually trusted.** A nightly full pull that produces no duplicates is more valuable than a 15-minute delta that we can't verify.

## Phase 0 — Confirm prerequisites (a few days)

*Out of dev's hands; primarily coordination.*

- Confirm with Twizzit (Philippe / contact at PandaPanda) the **status of the `last-modified` filter** on memberships (and ideally contacts and clubs). This determines whether Phase 4 ships at 15-min cadence or nightly. Block on this only for cadence — not for the rest of the build.
- Confirm **rate-limit headroom** for the staging tenant and what we can expect in production.
- Confirm Badminton Vlaanderen has rotated/created a fresh API key dedicated to Badman, separate from any human-test key.
- Confirm staging Twizzit data we can use without affecting live members.

**Exit criteria:** we know the cadence Phase 4 will target and we have a working API key in 1Password.

## Phase 1 — Architect & detailed design (1 week)

- Map every Twizzit entity we will read (`Contact`, `Membership`, `MembershipType`, `Organization`, the relevant `extra-fields`) to Badman's existing models (`Player`, `Club`, `ClubPlayerMembership`, …).
- Decide membership-type representation in Badman (replacing `competitionPlayer: bool`). Configuration table vs enum vs typed model.
- Decide the deduplication & merge strategy for the existing duplicates: in-place merge, side-table audit, or rebuild.
- Design the new sync module's public surface inside `apps/worker/sync` and how it relates to (and eventually supersedes) the existing `sync-twizzit/sync-twizzit.ts` processor.
- Decide the abstraction boundary that lets a non-Twizzit federation plug a different source in later (interface, not implementation).
- Land an ADR for each non-trivial decision.

**Exit criteria:** ADR(s) merged; a single page that points at every artefact (schema delta, interface, sync module shape).

## Phase 2 — Schema & matching foundation (≈12 SP)

- Add `twizzitId` to `Player`, indexed and unique.
- Add the membership-type representation; migrate the boolean `competitionPlayer` data into it.
- Tighten the Player uniqueness constraints to mirror Twizzit (firstName + lastName + dateOfBirth) without breaking historical data.
- Backfill `twizzitId` for existing players where a confident match is possible (`memberId` → Twizzit contact).
- Stand up the duplicate-detection report so we have a baseline number to drive down.

**Exit criteria:** schema migration applied to staging; baseline duplicate count published.

## Phase 3 — Sync module core (≈20 SP)

- Build the new sync module: auth → fetch organisation id → fetch memberships → fetch contacts referenced → reconcile.
- Implement upsert logic keyed on `twizzitId` for both player and membership.
- Implement the membership-type cache (pulled less often, validated on every full sync).
- Plug into the existing cron framework (`system.CronJobs`).
- Wire structured logging + the metrics from F7.

**Exit criteria:** running the sync end-to-end against staging produces idempotent state and a clean log; manual run from CLI works.

## Phase 4 — Cadence, deltas, retries (≈8 SP)

- If `last-modified` is available: implement delta-pull and switch cadence to every 15–30 minutes.
- If not: ship the nightly full-pull mode and put a flag in place to flip to delta mode later without redeploy.
- Plug into the retry mechanism mentioned in the 12/03/2026 sprint notes.
- Add the alerting from F7.3.

**Exit criteria:** sync runs on schedule for a week in staging without manual intervention.

## Phase 5 — Decommission / discipline the legacy create paths (≈8 SP)

- Audit the create-on-not-found logic in `competition-sync/processors/player.ts`, `tournament-sync/processors/player.ts`, and `sync-ranking/ranking-sync.ts` (per the dev-team analysis).
- Either disable creation in those paths or make them produce records that the next Twizzit sync will reconcile.
- Remove or gate the name-based fallback matching.

**Exit criteria:** in staging, only the Twizzit sync creates Player rows; other syncs only update.

## Phase 6 — Cutover to production (≈4 SP)

- Run the sync against production in shadow mode (no writes, just diff against current DB) for at least one full sync interval.
- Address any "would-create" or "would-update with surprising delta" output.
- Switch on writes during a low-traffic window (likely a weekday morning).
- Remove or archive the old weekly [toernooi.nl](http://toernooi.nl) manual-export procedure.

**Exit criteria:** acceptance criteria A1–A5 from the requirements doc pass against production.

## Phase 7 — Post-cutover (ongoing)

- Monitor the duplicate-detection dashboard; ratchet the threshold down over time.
- Re-evaluate cadence based on observed Twizzit load (15 min may be more than needed).
- Plan v1.1: surface officiating qualifications in Badman (Wedstrijdleider → game-leader feature, see *Sync with Jeroen*).
- Document for the LFBB rollout: which pieces are reusable, which need configuration.

## Critical-path dependencies

[callout]

- **Phase 4 cadence** depends on the Twizzit `last-modified` filter shipping.
- **Phase 5** depends on Phase 3 being stable in staging — you cannot remove the legacy create paths until Twizzit is reliably creating players.
- **Phase 6** depends on the Phase 2 backfill having matched a high-enough percentage of existing players to Twizzit ids — otherwise cutover produces an avalanche of "new" creates.

[/callout]

## Sequencing notes

- Per the 12/03/2026 sprint meeting, registration module work runs in parallel and ranking work has historically taken priority. **This plan assumes Twizzit is the active workstream**, with another developer onboarded as discussed.
- Existing scope estimates from the *Twizzit Integratie → Scope* database (Sync Module setup 20–32h, Sync Module Core logic 40h, Fix duplicate data 8–16h, Testing/deployment 32–40h) align with Phases 2–6 above and total roughly 100–128 dev hours, i.e. ≈3–4 dev-weeks of focused work plus the architecture week. The phase split here is the same scope re-cut for clarity.

## Definition of done (for the integration as a whole)

- The weekly [toernooi.nl](http://toernooi.nl) manual import is gone.
- A change made in Twizzit lands in Badman within the agreed cadence.
- Duplicate player creation has stopped at the source.
- The team has confidence (via dashboards/alerts) that a silent failure would be detected within a day.
- The membership-type model in Badman matches the federation's actual rules.