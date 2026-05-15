# ❓ Gaps & open questions

*What we still don't know, where the documentation is silent, and decisions that are still owed before each phase can start. Grouped by the audience that needs to answer.*

## For Twizzit (Philippe / PandaPanda)

- **Q1. `last-modified` filter — status?** Promised in the 19/06/2025 meeting, re-discussed on 18/11/2025. Is it shipped? On which endpoints (memberships only? also contacts/clubs/membership-types)? What does the filter look like (query param name, format, inclusive/exclusive)?
- **Q2. Pagination contract.** What is the page-size cap on `/contacts` and `/memberships`? Is it cursor-based or offset-based? What does the response look like at the boundary?
- **Q3. Rate limits.** What is the published per-minute / per-hour rate limit for the Badminton Vlaanderen key today, and what would be allocated for production at a 15–30 minute cadence? `429` response shape & retry-after?
- **Q4. Webhooks / push.** Confirmed *not available* publicly today. Is there a roadmap item we should track? (We saw Twizzit has internal push to [toernooi.nl](http://toernooi.nl) — anything reusable?)
- **Q5. Soft-delete vs hard-delete.** When a contact or membership is removed in Twizzit, does it disappear from the API entirely, or is it returned with a `deleted` flag / archived status?
- **Q6. Club endpoint.** We have `organization-ids[]` everywhere but no documented `clubs` resource in our exploration. Is there a dedicated clubs endpoint we haven't activated, or are clubs derivable solely via `club-id` on memberships?
- **Q7. Loan effective dating.** A Loan-type membership covers one season (1 July → 30 June). Does the API expose the underlying transfer document or just the resulting membership? Do we need anything beyond the membership record for Badman?
- **Q8. Stable IDs.** Are `contact.id`, `membership.id`, `membership-type.id`, `extra-field.id`, and the `"Member ID"` extra-field value all considered immutable, or can any of them be reassigned? (The whole sync depends on at least `contact.id` and `membership.id` being immutable.)

## For Badminton Vlaanderen (Jeroen / Tom)

- **Q9. Membership-type semantics.** We know the names (Competitive, Recreative, Youth, Loan, Non-player, Trial, Unbound summer). For each, we need a definitive list of what a player **can/cannot do** in Badman — e.g. play in encounters, play tournaments, register for events, be selected on a team, etc. Today this is a single boolean.
- **Q10. Ineligible-player UX.** Today Badman shows a warning when a non-competition player is added to an encounter but lets it through. Should that remain, become a hard block, or stay a warning with new resolution? Same question for Trial and Unbound summer.
- **Q11. Duplicate cleanup policy.** When two existing Badman players resolve to one Twizzit contact, what wins — the older record (history-preserving) or the one with the most recent activity? And who signs off on a merge that touches historical games?
- **Q12. Recreational clubs in scope?** From the 18/11/2025 meeting it sounds like only competition clubs matter. Do we *ignore* recreational clubs entirely, *fetch but don't use* them, or are there second-class scenarios (e.g. recreational club hosting a friendly) we need to support?
- **Q13. 2nd-club memberships.** Confirmed *not* relevant for Badman — we will not import them. Confirm this is fine even for edge cases.
- **Q14. Game-leader / Wedstrijdleider.** The 01/12/2025 *Sync with Jeroen* notes flag this. Is exposing referee qualifications in Badman v1 work or v1.1?
- **Q15. "Once cutover, the manual export goes away." Confirm.** Is anyone outside Badman still relying on the weekly export landing in some shared location?
- **Q16. Rollback expectation.** If the integration goes wrong, what's the agreed degraded-mode behaviour — freeze on last good state, or fall back to manual import?

## For the dev team (us)

- **Q17. Membership-type schema choice.** Configuration table vs typed model vs string enum. Pinned in Phase 1 as an ADR, but the choice constrains how much hand-coding the LFBB rollout will need later.
- **Q18. Backfill confidence.** What percentage of existing Badman players can we deterministically link to Twizzit by `memberId` alone? We need this number before Phase 6 cutover — below some threshold, cutover produces an unacceptable wave of "new" creates.
- **Q19. Shadow-run tooling.** Phase 6 calls for a shadow mode (run sync, log diff, don't write). Do we build it as a flag inside the sync module or as a separate dry-run command?
- **Q20. Test fixtures.** Twizzit doesn't appear to expose a sandbox tenant. Where do integration tests run — against staging Twizzit data, recorded fixtures, or both?
- **Q21. Federation-agnostic interface.** N3.1 says Twizzit code must be replaceable. Concretely: define the seam in Phase 1. Until then, every "this is Twizzit-specific" is a smell.
- **Q22. Existing `sync-twizzit/sync-twizzit.ts`.** What does it currently do in production? Is it scheduled, dormant, or actively misbehaving? It already creates players in a way that's flagged in the duplicate analysis. We need to know whether replacing it is hot or cold work.

## Documentation gaps (work I couldn't finish in this pass)

- **G1. Live Swagger contents not captured.** I could not extract the rendered endpoint list / parameters / schemas from the live Swagger UI in this session (the static HTML is JS-rendered and the browser bridge available to me could list the tab but not execute scripts inside it). The reference index in this Notion sub-tree is built from observed responses (`API exploration` page) plus meeting transcripts — which covers everything we have actually used — but it does **not** enumerate every endpoint Twizzit exposes for our key. **Action:** when the Swagger is open, copy the OpenAPI/JSON spec (the Swagger UI usually exposes it via a `Download` link, or it's loaded from a URL visible in the page source) and either paste it as an attachment under the API Reference Index page or extend that page with a complete endpoint table.
- **G2. Membership-type → capability matrix.** Question Q9 above. Until that matrix exists, the schema decision in Phase 1 has a hole.
- **G3. Club identification source of truth.** We treat clubs as an existing Badman concept matched by Twizzit `club-id` and name. We don't yet have a documented mapping for what to do when a Twizzit club has no Badman counterpart (auto-create? skip? alert?).
- **G4. Error taxonomy.** No explicit list of "if Twizzit returns X, the sync does Y". Worth pinning down before Phase 3 ships.
- **G5. LFBB delta.** LFBB uses the same Twizzit and the same membership types but the *district* and *language* axes differ. Whatever we configure for BV should be parameterised, not hard-coded. There is no current LFBB-specific document in this folder.

## Decisions still owed

[table]

ID | Decision | Owner | Blocks

--- | --- | --- | ---

D1 | Cadence: 15 min vs 30 min vs nightly initially | Tech + product | Phase 4

D2 | Membership-type schema in Badman | Tech (ADR) | Phase 1 → 2

D3 | Duplicate-merge policy | Product (Tom/Jeroen) + tech | Phase 2 backfill

D4 | Where to draw the federation-agnostic interface | Tech (ADR) | Phase 1

D5 | Whether to ship Wedstrijdleider exposure in v1 | Product | Phase 1 scope

D6 | Shadow-run vs full-cutover plan for production | Tech + product | Phase 6

[/table]

## How to use this doc

- Anything in **For Twizzit** — batch into the next contact with Philippe / PandaPanda. The cadence question (Q1) is on the critical path.
- Anything in **For Badminton Vlaanderen** — raise in the next sprint sync; Q9 (membership semantics) is the biggest single unknown.
- Anything in **For the dev team** — own internally, resolve before the relevant phase.
- **Documentation gaps** — close as we go; G1 is the easiest one to clear (open Swagger, copy spec).