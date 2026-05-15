# `GET /membershipTypes` — Swagger contract (captured 2026-05-13)

Source: Twizzit Swagger UI for Badminton Belgium API key. Captured by user, pasted in MAQA chat 2026-05-13.

```
[membership-type {
  id              integer
  name            { EN: string, NL: string, FR: string }
  type            string
  duration        integer
  duration-unit   string
  end-date        string
  transfer-date   string
}]
```

## Drift vs `libs/integrations/twizzit-client/src/schemas/membership-type.ts` (current as of d9c0b2f8c)

| Field | Current schema | Swagger | Action |
|-------|---------------|---------|--------|
| `id` | `number` (int, > 0) | `integer` | match — OK |
| `name` | `LocalisedNameSchema` | `{ EN, NL, FR }` | match — OK |
| `type` | enum `"Continuously" \| "Seasonal" \| "Fixed length" \| "Fixed end date"` | `string` (unconstrained) | **keep enum** — we are deliberately stricter than Swagger. The api-exploration capture only ever shows these four values across all 7 BV types. A new value crashes the sync via `TwizzitValidationError`, which is the desired strict-everywhere behavior (per Clarification 2026-05-12 #5). |
| `duration` | `number \| null` | `integer` (not marked nullable) | **keep `\| null`** — Swagger under-documents nullability. The live samples in [api-exploration.md](api-exploration.md) show `duration: null` for 5 of 7 BV membership types; only "Trial membership" and a hypothetical fixed-duration type would populate it. |
| `duration-unit` | enum `"Days" \| "Months" \| "Years" \| null` | `string` (not nullable) | **keep enum + null** — same reasoning as `type` and `duration`. Live data shows null for everything except Trial (`"Days"`). |
| `end-date` | `string \| null` | `string` (not nullable) | **keep `\| null`** — live data shows `null` for `Continuously` and `Seasonal` types; populated as `"MM-DD"` format for `Fixed end date` ("Unbound summer player" carries `"09-07"`). |
| `transfer-date` | `string \| null` | `string` (not nullable) | **keep `\| null`** — same pattern; live data shows it for "Unbound summer" only. |

## Verdict

**No drift fixes needed for this schema.** Swagger is uniformly under-documenting nullability (a common Swagger generator quirk where every primitive defaults to non-nullable); our schema correctly reflects the live response sample.

The only future-proofing concern is the strictness of the `type` and `duration-unit` enums. If Twizzit ever introduces a new membership type (e.g. a "Lifetime" or "Sponsorship" category) or a new duration unit (e.g. "Weeks"), strict-zod will throw `TwizzitValidationError` on the next sync. That's the agreed behavior — the federation has to coordinate schema bumps with the Badman team.

## Follow-up

- Bundle into the schema-refresh follow-up agent (no code change required for this file).
- Keep an eye on the live test output: if `RUN_TWIZZIT_LIVE_TESTS=1` ever surfaces a non-null `duration-unit` outside `{Days, Months, Years}`, capture the new value here and amend the enum.
