# Data Model: Twizzit API Client

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-12 *(rewritten 2026-05-13 to capture the generic-types decision)*

The lib exposes **only federation-agnostic types** on its public surface (Clarification 2026-05-13). Consumers see `FederationContact`, `FederationMembership`, etc. — never `TwizzitContact`. Each zod schema in `src/schemas/*` takes Twizzit's raw kebab-case wire format as INPUT and `.transform()`s it into the generic camelCase shape as OUTPUT. Twizzit's wire format is documented in [docs/twizzit/api-exploration.md](../../docs/twizzit/api-exploration.md) and the Swagger drift notes under `docs/twizzit/*-swagger.md`; this document describes the **public** (post-transform) shapes.

All schemas use strict zod (Clarification 2026-05-12 #5) — unknown wire keys cause `TwizzitValidationError`.

---

## Shared shapes (`src/federation.ts`)

### FederationLocalisedName

```text
{ en: string, nl: string, fr: string }
```

All three keys required. Lowercase locale codes (the wire format's `EN/NL/FR` are mapped at parse time).

### FederationAddress

```text
{
  street: string,
  number: string,
  box: string,
  postalCode: string,
  city: string,
  country: FederationLocalisedName
}
```

Empty values stay as empty strings at this level (the wire format does the same); they aren't normalised to `null`.

### FederationEmail

```text
{ target: string | null, address: string }
```

Wire `target: ""` is normalised to `null`. Wire `email` becomes `address` (consumer-friendly name). Empty-address entries are filtered out at the contact level — see `FederationContact.emails` below.

### FederationPhone

```text
{ target: string | null, countryCode: string | null, number: string }
```

Wire `cc` becomes `countryCode`. Empty `cc`/`target` → `null`. `number` may be empty when the slot is unused (filtered at the contact level).

### FederationExtraFieldValue

```text
{
  field: {
    id: number | string,
    name: FederationLocalisedName,
    type: string,
    location: "Contact" | "Membership" | null
  },
  value: string,
  attributes: Array<{ attributeId: number | string, value: string }>
}
```

The wire format keys `extra-field` (kebab) and `attribute-id` (kebab) are renamed to `field` and `attributeId`. Wire `location === ""` is normalised to `null`.

---

## AuthenticateResponse (`src/schemas/authenticate.ts`)

```text
{
  token: string,            // JWT (opaque)
  "created-on": number,     // unix-seconds
  "valid-till": number      // unix-seconds
}
```

**Internal only**: not exported. The `TwizzitClient` consumes this to manage its session (token + proactive refresh at 80 % of `valid-till - created-on`); consumers never see the auth response shape directly.

---

## FederationOrganization

```text
{ id: number | string, name: string }
```

For Twizzit's BV tenant: `{ id: 34245, name: "Badminton Belgium" }`.

---

## FederationContact

```text
{
  id: number | string,
  fullName: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string | null,         // ISO date YYYY-MM-DD, "" → null
  gender: "M" | "F" | "X" | null,
  nationality: string | null,
  language: string | null,
  accountNumber: string | null,
  registryNumber: string | null,
  federationNumber: number | string | null,
  memberId: string | null,            // extracted from extraFields where field.name.en === "Member ID"
  hasProfileImage: boolean,
  address: FederationAddress,
  emails: FederationEmail[],          // empty slots filtered out
  mobiles: FederationPhone[],         // empty slots filtered out
  home: FederationPhone | null,       // null if wire .number === ""
  extraFields: FederationExtraFieldValue[]
}
```

**Wire→generic field renames** applied by the schema's transform:
- `name` → `fullName`
- `first-name` → `firstName`, `last-name` → `lastName`
- `date-of-birth` → `dateOfBirth` (empty string → `null`)
- `account-number` → `accountNumber`, `registry-number` → `registryNumber`
- `number` (top-level, federation/toernooi.nl numeric id) → `federationNumber`
- `email-1`, `email-2`, `email-3` → consolidated into `emails[]`, filtered to non-empty addresses
- `mobile-1`, `mobile-2`, `mobile-3` → consolidated into `mobiles[]`, filtered to non-empty numbers
- `home` (wire kebab key matches camelCase here by accident) → `home`, or `null` when its number is empty
- `has-profile-image` → `hasProfileImage`
- `extra-field-values` → `extraFields`
- **Derived**: `memberId` extracted from the `Member ID` extra-field-value (if present and non-empty), surfaced as a top-level convenience field.

---

## FederationMembership

```text
{
  id: number | string,
  contactId: number | string,
  membershipTypeId: number | string,
  clubId: number | string | null,     // Swagger says nullable
  seasonId: number | string | null,
  startDate: string,                  // ISO date YYYY-MM-DD
  endDate: string | null,             // wire "" → null
  extraFields: FederationExtraFieldValue[]
}
```

Wire renames: `contact-id`, `membership-type-id`, `season-id`, `club-id`, `start-date`, `end-date`, `extra-field-values` → camelCase per pattern above. `club-id` is nullable per the Swagger contract (memberships-swagger.md).

**Loan memberships** are *separate* rows pointing at the "Loan player" membership type (id 57915 in BV); the client does not eagerly join.

---

## FederationMembershipType

```text
{
  id: number | string,
  name: FederationLocalisedName,
  type: "Continuously" | "Seasonal" | "Fixed length" | "Fixed end date",
  duration: number | null,
  durationUnit: "Days" | "Months" | "Years" | null,
  endDate: string | null,             // "MM-DD" format for Fixed-end-date types
  transferDate: string | null         // "MM-DD" format for the transfer cutoff
}
```

Wire renames: `duration-unit`, `end-date`, `transfer-date` → camelCase. `name.EN/NL/FR` → `name.en/nl/fr`.

Observed BV types (2026-05-12 capture): Competitive member (51774), Recreative member (51779), Loan player (57915, Seasonal), Non-player (57920), Trial membership (57922, Fixed length 21 Days), Youth (58449), Unbound summer player (72908, Fixed end date 09-07).

---

## FederationExtraField

```text
{
  id: number | string,
  name: FederationLocalisedName,
  type: "Text" | "Date" | "Single select" | "Multiple select" | "Checkbox",
  location: "Contact" | "Membership" | null,
  options: string[],                  // empty array when no options
  attributes: Array<{ id: number | string, name: string, type: string }>
}
```

Wire `location === ""` is normalised to `null`. Locale keys lowercased.

Critical IDs in the BV tenant (documented in [`twizzit-api-reference-index.md`](../../docs/twizzit/twizzit-api-reference-index.md)): `Member ID` (41763), `VOTAS-ID` (41654), `Migratie` (42452), `Wedstrijdleider / Responsable` (41297), `Club type` (40775).

---

## Error variants (`src/errors.ts`)

Not Twizzit-side shapes — the discriminated-union errors the lib throws (FR-015):

```text
type TwizzitError =
  | TwizzitAuthError       { kind: "auth";       endpoint, status, attempts }
  | TwizzitValidationError { kind: "validation"; endpoint, path, expected, actualSummary }
  | TwizzitNetworkError    { kind: "network";    endpoint, code }
  | TwizzitRateLimitError  { kind: "rate-limit"; endpoint, retryAfterMs, attempts }
  | TwizzitServerError     { kind: "server";     endpoint, status, bodyExcerpt }
  | TwizzitClientError     { kind: "client";     endpoint, status, bodyExcerpt, subkind? }
```

**Construction-time guarantee**: error messages constructed by the lib must NOT string-interpolate the password or bearer token. `bodyExcerpt` is a truncated (max ~200 char) excerpt of the response body — it is not deep-scrubbed for secrets (2026-05-13: deep `redact()` pipeline removed; Twizzit responses do not echo credentials, and platform-level structured-logging redaction handles defence in depth in the consumer). See FR-016 and `research.md` R12.

---

## Validation policy summary

- **Strict everywhere** — `.strict()` on every raw wire-format schema. New Twizzit fields fail loudly.
- **One layer of transformation** — wire kebab/uppercase → generic camelCase/lowercase, applied per-field in each schema's `.transform()`. The only "coercion" beyond renaming is `"" → null` for documented empty-string fields and the email/mobile slot consolidation.
- **No `.passthrough()`** anywhere.
- **No optional fields invented to soften strictness** — if Twizzit omits a documented wire field, the schema fails. Capture a fixture and decide.

---

## Out of scope (deliberately)

- Mapping any `Federation*` shape to a Badman `Player`, `Club`, or `ClubPlayerMembership`. That is the Phase 3 sync engine's job.
- The `twizzitId` column on `Player`. That is Phase 2 of the broader plan (different scope from this spec).
- Caching schemas across processes. The schemas are static at module-import time.
