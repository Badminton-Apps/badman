# Data Model: CP Webhook Hardening

No new persistent entities. No database migrations required.

## Modified In-Memory Structures

### CpGenerationRecord (existing, no field changes)

```
runId      : string   — tracking key (eventId-timestamp initially; replaced by real run_id via webhook)
userId     : string   — player UUID
eventId    : string   — competition event UUID
locale     : string   — default "nl_BE"
status     : "pending" | "completed" | "failed"
createdAt  : Date
gistId?    : string   — GitHub Gist ID (present until cleaned up)
```

**State transitions** (unchanged):

```
[generate called] → pending
[webhook completed] → completed
[webhook failed]    → failed
```

### WebhookBody (new validated input shape, in-controller only)

```
run_id   : string   — non-empty; GitHub Actions run ID
user_id  : string   — non-empty; player UUID
status   : "completed" | "failed"
```

Validation is manual (guard clauses), consistent with project conventions. No DTO class is introduced.

## Idempotency Key

`this.generations.has(body.run_id)` with status !== `"pending"` → already processed. The Map is keyed by both the internal tracking ID and the real `run_id` after webhook receipt. A second delivery of the same `run_id` hits the already-existing key and is short-circuited.
