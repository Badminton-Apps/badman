# 📚 Twizzit API — Reference Index

*High-level orientation map for the Twizzit REST API as it applies to the Badman integration. This is not a full spec mirror — it points to where to find each thing and what it gives you. The authoritative source is the Swagger UI (linked below).*

## Source of truth

- **Live Swagger UI (Badminton Belgium key)**: [https://app.twizzit.com/v2/api/documentation/enlJQ2pOaTUyN0hBYTdWRXhZTWJoQT09](https://app.twizzit.com/v2/api/documentation/enlJQ2pOaTUyN0hBYTdWRXhZTWJoQT09)
- This Swagger is **personalised** to the Badminton Belgium API key — it only shows endpoints activated for that key. A different client would see a different surface.
- API key / credentials are managed in Twizzit by Badminton Vlaanderen at `Beheer → Instellingen → API`. We (Dashdot) cannot create or rotate keys ourselves.

## How the API is structured

<aside>
💡

Three things to know up front:

1. **JWT auth.** Hit `authenticate` with username/password to get a bearer token. Send it as `Authorization: Bearer <token>` on every other call.
2. **Organization-scoped.** Almost every endpoint requires an `organization-ids[]` query parameter. Get the value once via `GET /organizations` and reuse it.
3. **No webhooks, no push.** Polling only. Twizzit currently has **no `last-modified` filter** — the Twizzit team committed to adding one (state unknown — see gaps doc).
</aside>

## Endpoint groups (as observed)

*The list below covers everything we have actually exercised. The Swagger UI is the authoritative list — if a group is missing here, check there first.*

### 1. Authentication

- **POST `authenticate`** — exchanges username/password for a JWT. Returned token goes into the `Authorization: Bearer …` header for all other requests.

### 2. Organizations

- **GET `/organizations`** — returns the organisations linked to your API key. For Badminton Belgium this returns a single record (`id: 34245, name: "Badminton Belgium"`). The `id` is the value used in `organization-ids[]` on every subsequent call.

### 3. Contacts (people)

- **GET `/contacts`** — the personal-data side of a member. Includes name, date-of-birth, gender, nationality, language, addresses, up to three emails, three mobiles, plus a `extra-field-values` array (see Extra Fields below).
- Contact = person. Contacts and members are **coupled 1:1** in Twizzit; a member always has exactly one contact.
- The federation member ID (== the [toernooi.nl](http://toernooi.nl) ID, the value Badman currently calls `memberId`) lives **inside `extra-field-values`** under the `"Member ID"` extra field — *not* on the top-level contact.

### 4. Memberships (relationships)

- **GET `/memberships`** — the link table between a contact and a club, scoped to a membership type. Fields: `id`, `contact-id`, `membership-type-id`, `club-id`, `start-date`, `end-date`, optional `extra-field-values`.
- This is the **leading entity** for our sync. Twizzit advised us to drive the sync from memberships rather than contacts (160k+ contacts vs. far fewer changing memberships).
- Only one club id per membership. Loan situations are modelled as a *separate* membership of type "Loan player" on top of the player's own membership.

### 5. Membership Types

- **GET `/membershipTypes`** — the catalogue of membership categories defined by the federation. Each has a localised name (EN/NL/FR), a `type` (`Continuously`, `Seasonal`, `Fixed length`, `Fixed end date`), optional duration, and an optional fixed `end-date` / `transfer-date`.
- Observed types relevant to Badman: **Competitive member**, **Recreative member**, **Youth**, **Loan player** (seasonal), **Non-player**, **Trial membership** (21 days), **Unbound summer player** (fixed end-date 09-07).
- Treat this as **slowly-changing reference data** — pull on each sync but expect zero deltas most of the time.

### 6. Extra Fields

- **GET `/extra-fields`** — the schema definition for all custom fields configured in this Twizzit tenant. Each has an `id`, localised `name` (EN/NL/FR), a `type` (`Text`, `Date`, `Single select`, `Multiple select`, `Checkbox`), a `location` (`Contact`, `Membership`, club-level/blank, …), `options` (for selects) and `attributes` (sub-fields like "obtained-on date").
- Critical fields for Badman:

| Field | Location | Why we care |
| --- | --- | --- |
| `Member ID` (id 41763) | Contact | Federation/[toernooi.nl](http://toernooi.nl) ID — primary external key for matching players today. |
| `VOTAS-ID` (id 41654) | Contact | Secondary identifier seen in responses; not currently used in Badman but worth capturing. |
| `Migratie` (id 42452) | Contact | Migration helper field — surface unknown, may be useful for legacy data reconciliation. |
| `Wedstrijdleider / Responsable` (id 41297) | Contact | Marks who can act as a match referee — relevant to game-leader feature in Badman (per Sync with Jeroen). |
| `Club type` (id 40775) | (club level) | Distinguishes `Competitieclub` vs `Recreantenclub` — only competition clubs play in our competitions. |
| `2nd club` (id 40748) | Membership | Out of scope: not relevant for Badman per Jeroen. |
| Referee / Umpire / Coach / Trainer BV / Line judge / API degree | Contact | Officiating qualifications — out of MVP scope but documented for future features. |

## Auth & request pattern (cheat sheet)

```
POST /authenticate           { username, password }  →  { token }
GET  /organizations          Authorization: Bearer <token>     →  [{ id, name }, …]
GET  /<resource>?organization-ids%5B%5D=34245   ← every other call
```

## Known limitations

- **No `last-modified` filter** today. Without it, the only honest sync is "pull all memberships, diff against our DB" — not viable at the requested cadence (every 15–30 min) given rate limits. Twizzit committed to adding a last-modified filter on memberships (and, ideally, contacts/clubs). Status: open.
- **Tight rate limits.** Twizzit explicitly flagged we'd "hit the ceiling fast" — they will raise it once integration goes live, but the sync must be designed to be parsimonious.
- **No webhooks.** They have webhook-style integrations elsewhere ([toernooi.nl](http://toernooi.nl)), but not exposed publicly via this API. Polling is the only option for now.
- **One-way only.** Read-only from Badman's perspective in v1 — we do not push back to Twizzit.
- **Personalised Swagger.** What you see in the Swagger UI depends on which endpoints are activated for the API key in use.

## Where each thing lives in Twizzit (mental model)

<aside>
💡

**Club data** → top-level org/club records (out of MVP scope).

**Person data** → `Contact` (incl. federation member ID inside `extra-field-values`).

**Club ↔ person link** → `Membership`, qualified by `membership-type-id`.

**What someone is allowed to play** → derived from `membership-type-id` against `MembershipType` catalogue.

**Loans / transfers** → separate memberships of the appropriate type, all rules enforced by Twizzit.

</aside>

## Related docs

- See **Integration: Twizzit → What this integration does** for the why and the business model.
- See **Integration: Twizzit → Requirements** for the consolidated requirements list.
- See **Integration: Twizzit → Implementation Plan** for sequencing.
- See **API exploration** (under `Badman Twizzit sync`) for raw response samples used to compile this index.

## Twizzit client lib

The typed TypeScript client implementing this API surface is `@badman/integrations-twizzit-client`. Source and developer docs: [`libs/integrations/twizzit-client/README.md`](../../libs/integrations/twizzit-client/README.md). Delivered in spec 015 / PR #909.