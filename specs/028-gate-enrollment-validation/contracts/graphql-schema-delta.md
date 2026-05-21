# GraphQL Schema Delta

## Field affected

`EventEntry.enrollmentValidation`

## Before

```graphql
type EventEntry {
  # ... unchanged fields ...

  """
  Validate the enrollment
  **note**: the levels are the ones from may!
  """
  enrollmentValidation: TeamEnrollmentOutput
}
```

## After

```graphql
type EventEntry {
  # ... unchanged fields ...

  """
  Validate the enrollment. Defaults to null. Pass `validate: true` to compute —
  this is a club-wide computation; only request it when you really need it.
  **note**: the levels are the ones from may!
  """
  enrollmentValidation(validate: Boolean = false): TeamEnrollmentOutput
}
```

## Compatibility analysis

| Concern | Verdict |
|---|---|
| Field name | Unchanged. |
| Return type | Unchanged (still `TeamEnrollmentOutput`, still nullable). |
| New argument | Optional with default `false`. Existing query documents that select the field without arguments remain valid SDL. |
| Runtime semantics for legacy queries | **Changes**: returns `null` instead of a computed payload. This is the intended fix. The kill-switch env var lets the platform team flip back to "compute by default" without redeploy. |
| Codegen / typed clients | New optional arg appears in generated types. No type narrowing breaks; return type already includes `| null`. |

## Caller contract

Callers that need the validation payload MUST pass `validate: true`:

```graphql
query MyEnrollmentWizardQuery($teamId: ID!) {
  team(id: $teamId) {
    entries {
      id
      enrollmentValidation(validate: true) {
        # ... unchanged payload shape ...
      }
    }
  }
}
```

Callers that do not need the payload should drop the field from the selection set (preferred) or accept `null`.

## Error contract

When `validate: true` (or the kill-switch is active) and the underlying
`EnrollmentValidationCacheService.getForTeam(team)` rejects, the error MUST
propagate to the client. The resolver MUST NOT swallow the rejection into
`null` — that would conflate "not requested" with "computation failed"
(spec FR-006).

## Sibling resolver

`EnrollmentResolver.enrollmentValidation` at `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts:25-35` is a top-level `Query`-side resolver that already requires an explicit `EnrollmentInput` argument. It is opt-in by construction and is NOT changed by this contract delta.
