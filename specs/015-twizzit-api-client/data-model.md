# Data Model: Twizzit API Client

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-12

These are the **external** entity shapes returned by the Twizzit API, expressed as zod schemas. They are not Badman domain entities — no Sequelize, no GraphQL, no `@badman/backend-database`. Every type a consumer of the lib touches is inferred from the schema below (FR-010). All schemas use zod **strict** mode (Clarification 2026-05-12 #5): unknown keys cause `TwizzitValidationError`. Empty-string conventions (`""` → `null`) are normalised by `.transform()` in the schemas where applicable.

The relationships are read-only — a Membership references a Contact and a MembershipType by id, but the client does not eagerly resolve those references; the consumer composes them.

---

## Shared shapes (`src/schemas/shared.ts`)

### LocalisedName

```text
{
  EN: string,
  NL: string,
  FR: string
}
```

Used by `MembershipType.name`, `ExtraField.name`, and country names inside `Contact.address`. All three keys MUST be present (strict).

### Email / Mobile / Phone

```text
Email = {
  target: string | null,   // empty string normalised to null
  email: string             // may be empty string when slot is unused
}
Mobile = Phone = {
  target: string | null,
  cc: string | null,        // empty string normalised to null
  number: string            // may be empty string
}
```

### Address

```text
{
  street: string,
  number: string,
  box: string,
  postalCode: string,
  city: string,
  country: LocalisedName
}
```

All fields are present strings; empty values appear as `""` rather than absent.

---

## AuthenticateResponse (`src/schemas/authenticate.ts`)

```text
{
  token: string,            // JWT (treated as opaque by this lib)
  "created-on": number,     // unix-seconds, when Twizzit issued the token
  "valid-till": number      // unix-seconds, when Twizzit will reject this token
}
```

**Notes**: Twizzit returns both `created-on` and `valid-till` in the response body. The observed `valid-till - created-on` is **1800 s (30 minutes)** — significantly shorter than the JWT's own `exp` claim (24 h on the same response). The lib MUST trust the response body's `valid-till` over the JWT's `exp`: the server may invalidate a token before its cryptographic expiry, so the body field is the binding lifetime signal. As a consequence, the lib does **not** parse the JWT payload at all — the token is treated as opaque (per R5 in research.md).

---

## Organization (`src/schemas/organization.ts`)

```text
{
  id: number,    // integer, > 0
  name: string   // non-empty
}
```

The lib's `getOrganizations()` returns `Organization[]`. The Badminton Belgium record is `{ id: 34245, name: "Badminton Belgium" }`; the lib does not hard-code this — it's the consumer's job to pick.

---

## ExtraFieldValue (`src/schemas/contact.ts` → reused by Contact)

```text
{
  extraField: {
    id: number,
    name: LocalisedName,
    type: "Text" | "Date" | "Single select" | "Multiple select" | "Checkbox",
    location: "Contact" | "Membership" | "" | null,
    extraFieldAttributes: Array<{
      id: number,
      name: string,
      type: string             // free-form for now; tighten when more samples arrive
    }>
  },
  value: {
    value: string,             // the stored value; may be empty
    attributes: Array<{
      "attribute-id": number,
      value: string
    }>
  }
}
```

**Strictness note**: `extraField.type` is currently a string-union of observed values. If Twizzit introduces a new type (e.g. `"Number"`), the schema will fail loudly (per the strict-everywhere policy) — which is the desired behavior.

---

## Contact (`src/schemas/contact.ts`)

```text
{
  id: number,
  name: string,
  "date-of-birth": string | null,         // ISO date "YYYY-MM-DD"; empty → null
  gender: "M" | "F" | "X" | null,         // narrow set; widen when needed
  nationality: string | null,             // ISO 2-letter or null
  language: string | null,                // "nl" | "fr" | "en" | … ; null when unset
  "account-number": string | null,
  "registry-number": string | null,
  number: string | null,
  "email-1": Email,
  "email-2": Email,
  "email-3": Email,
  "mobile-1": Mobile,
  "mobile-2": Mobile,
  "mobile-3": Mobile,
  phone: Phone,
  address: Address,
  "has-profile-image": boolean,
  "extra-field-values": ExtraFieldValue[]
}
```

**Member ID extraction helper**: not a schema field; the lib MAY expose a derived helper `getMemberId(contact: Contact): string | null` that locates the extra-field-value whose `extraField.name.EN === "Member ID"` and returns its `value.value` (or `null`). This is a convenience over the raw shape and lives next to the schema, not inside it.

---

## Membership (`src/schemas/membership.ts`)

```text
{
  id: number,
  "contact-id": number,
  "membership-type-id": number,
  "season-id": number | null,
  "start-date": string,                   // ISO date "YYYY-MM-DD"
  "end-date": string | null,              // empty string "" normalised to null
  "club-id": number,
  "extra-field-values": ExtraFieldValue[]
}
```

**Note**: a Loan membership is a *separate* row of this shape with `membership-type-id` pointing at the "Loan player" MembershipType. The client does not eagerly join.

---

## MembershipType (`src/schemas/membership-type.ts`)

```text
{
  id: number,
  name: LocalisedName,
  type: "Continuously" | "Seasonal" | "Fixed length" | "Fixed end date",
  duration: number | null,
  "duration-unit": "Days" | "Months" | "Years" | null,
  "end-date": string | null,              // "MM-DD" format observed for "Unbound summer"
  "transfer-date": string | null
}
```

Observed types in BV tenant (as of 2026-05-12): Competitive member (51774), Recreative member (51779), Loan player (57915, Seasonal), Non-player (57920), Trial membership (57922, Fixed length 21 Days), Youth (58449), Unbound summer player (72908, Fixed end date 09-07).

---

## ExtraField (`src/schemas/extra-field.ts`)

```text
{
  id: number,
  name: LocalisedName,
  type: "Text" | "Date" | "Single select" | "Multiple select" | "Checkbox",
  location: "Contact" | "Membership" | "" | null,
  options: string[],                      // empty array when no options
  attributes: Array<{
    id: number,
    name: string,
    type: string
  }>
}
```

Critical extra fields the integration cares about (documented in `twizzit-api-reference-index.md`): `Member ID` (id 41763), `VOTAS-ID` (id 41654), `Migratie` (id 42452), `Wedstrijdleider / Responsable` (id 41297), `Club type` (id 40775).

---

## Error variants (`src/errors.ts`)

Not Twizzit-side shapes — these are the discriminated-union errors the lib throws (FR-015):

```text
type TwizzitError =
  | TwizzitAuthError       { kind: "auth";       endpoint, status, attempts }
  | TwizzitValidationError { kind: "validation"; endpoint, path, expected, actualSummary }
  | TwizzitNetworkError    { kind: "network";    endpoint, cause: { code, message } }
  | TwizzitRateLimitError  { kind: "rate-limit"; endpoint, retryAfterMs, attempts }
  | TwizzitServerError     { kind: "server";     endpoint, status, bodyExcerpt }
  | TwizzitClientError     { kind: "client";     endpoint, status, bodyExcerpt, subkind? }
```

**Redaction invariant**: every field on every variant is constructed via the `redact()` helper. The bearer token, password, and full `Authorization` header value MUST NOT appear in any field (FR-016, enforced by `redact.spec.ts`).

---

## Validation policy summary

- **Strict everywhere** — `.strict()` on every object schema. New Twizzit fields fail loudly.
- **No coercion outside documented normalisations** — empty-string → `null` is the only allowed transform, applied only to the date and contact fields that Twizzit is known to return as `""`.
- **No `.passthrough()`** anywhere.
- **No optional fields invented to soften strictness** — if Twizzit omits a documented field, the schema fails. We then capture a fixture and decide.

---

## Out of scope (deliberately)

- Mapping any Twizzit shape to a Badman `Player`, `Club`, or `ClubPlayerMembership`. That is the Phase 3 sync engine's job.
- The `twizzitId` column on `Player`. That is Phase 2 of the broader plan (different scope from this spec).
- Caching schemas across processes. The schemas are static at module-import time.
