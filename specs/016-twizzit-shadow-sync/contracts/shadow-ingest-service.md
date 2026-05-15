# Contract: `TwizzitShadowIngestService`

**Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

Internal service in `@badman/backend-twizzit-shadow`. Not a public HTTP or GraphQL API.

---

## Dependencies

```typescript
interface TwizzitShadowIngestDeps {
  gateway: FederationGateway; // TwizzitClient in production
  sequelize: Sequelize;
  logger: Logger;
  config: TwizzitShadowIngestConfig;
}

interface TwizzitShadowIngestConfig {
  pageSize: number; // default 100
  interPageDelayMs: number; // default 250
  organizationId?: number;
}
```

---

## Public methods

### `runFullBackfill(opts?: { resumeFromRunId?: string }): Promise<SyncRunResult>`

Executes the ordered pipeline (organization → extra fields → membership types → memberships → contacts).

**Behaviour**:

1. Create `twizzit.sync_run` with `status = running`.
2. For each entity step, read checkpoint for `resumeFromRunId` or current run; start at `last_offset + page_size` (or 0).
3. Call `gateway.fetch*` with `{ pageSize, maxPages: 1 }` per iteration OR internal page loop with checkpoint after each page.
4. Upsert rows in a transaction per page; update checkpoint.
5. `await sleep(interPageDelayMs)` between pages.
6. On success: `status = completed`, set `finished_at`, write `counts`.
7. On unrecoverable error: `status = failed`, `error_summary`, rethrow.

```typescript
interface SyncRunResult {
  runId: string;
  status: "completed" | "failed";
  counts: Record<string, number>;
  errorSummary?: string;
}
```

---

## Upsert semantics

- **Key**: `twizzit_id` per shadow table.
- **On conflict**: update all columns + `sync_run_id` + `fetched_at`.
- **Idempotent**: Re-running the same page produces identical row state.

---

## Error handling

| Condition | Behaviour |
|-----------|-----------|
| `TwizzitRateLimitError` after client retries | Propagate; run → `failed`, checkpoint at last successful page |
| `TwizzitValidationError` on one record | Log context; skip record; continue page |
| DB error on page commit | Roll back page transaction; run → `failed` |

---

## Logging (FR-010)

Each page log line MUST include: `syncRunId`, `entityType`, `offset`, `pageSize`, `recordsInPage`, `durationMs`.

Run completion log MUST include aggregate `counts` and total duration.
