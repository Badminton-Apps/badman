# Data Model: Twizzit Shadow Sync

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-15

PostgreSQL schema **`twizzit`** — staging copy of Twizzit source data. Not exposed via GraphQL in v1. Payloads mirror `@badman/integrations-twizzit-client` `Federation*` shapes (JSONB).

---

## Entity relationship (logical)

```text
SyncRun 1 ──* SyncCheckpoint
SyncRun 1 ──* ShadowOrganization (0..1 active row per org id)
SyncRun 1 ──* ShadowExtraField
SyncRun 1 ──* ShadowMembershipType
SyncRun 1 ──* ShadowMembership
SyncRun 1 ──* ShadowContact

ShadowMembership.contact_id  → ShadowContact.twizzit_id (logical, not enforced FK in v1)
ShadowMembership.membership_type_id → ShadowMembershipType.twizzit_id
```

No foreign keys to `public.Player` or `public.Club` — comparison is a later spec.

---

## `twizzit.sync_run`

Tracks one backfill execution.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default `gen_random_uuid()` |
| `status` | ENUM/text | `pending` \| `running` \| `completed` \| `failed` |
| `organization_id` | BIGINT | Twizzit org used (`organization-ids[]`) |
| `started_at` | TIMESTAMPTZ | |
| `finished_at` | TIMESTAMPTZ | nullable |
| `page_size` | INT | Snapshot of config used |
| `inter_page_delay_ms` | INT | Snapshot of config used |
| `counts` | JSONB | `{ contacts, memberships, … }` upsert totals |
| `error_summary` | TEXT | nullable; last fatal message |
| `created_at` / `updated_at` | TIMESTAMPTZ | Sequelize timestamps |

**State transitions**: `pending` → `running` → (`completed` \| `failed`). Resume after crash: find latest `running` or `failed` run with checkpoints → operator may restart as new run or continue same run (implementation: **new run** that reads last checkpoint offsets per entity — simpler ops).

---

## `twizzit.sync_checkpoint`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `sync_run_id` | UUID FK → `sync_run.id` | |
| `entity_type` | TEXT | `organization` \| `extra_field` \| `membership_type` \| `membership` \| `contact` |
| `last_offset` | INT | Last successfully committed page offset (0-based) |
| `page_size` | INT | |
| `records_written` | BIGINT | Cumulative for this entity in run |
| `updated_at` | TIMESTAMPTZ | |

Unique: `(sync_run_id, entity_type)`.

---

## `twizzit.shadow_organization`

| Column | Type | Notes |
|--------|------|-------|
| `twizzit_id` | BIGINT PK | From `FederationOrganization.id` |
| `name` | TEXT | |
| `payload` | JSONB | Full `FederationOrganization` |
| `sync_run_id` | UUID | Last run that wrote this row |
| `fetched_at` | TIMESTAMPTZ | |

---

## `twizzit.shadow_extra_field`

| Column | Type | Notes |
|--------|------|-------|
| `twizzit_id` | BIGINT PK | |
| `payload` | JSONB | `FederationExtraField` |
| `sync_run_id` | UUID | |
| `fetched_at` | TIMESTAMPTZ | |

---

## `twizzit.shadow_membership_type`

| Column | Type | Notes |
|--------|------|-------|
| `twizzit_id` | BIGINT PK | |
| `payload` | JSONB | `FederationMembershipType` |
| `sync_run_id` | UUID | |
| `fetched_at` | TIMESTAMPTZ | |

---

## `twizzit.shadow_membership`

| Column | Type | Notes |
|--------|------|-------|
| `twizzit_id` | BIGINT PK | Membership `id` |
| `contact_id` | BIGINT | Indexed |
| `club_id` | BIGINT | nullable; indexed |
| `membership_type_id` | BIGINT | Indexed |
| `season_id` | BIGINT | nullable |
| `start_date` | DATE | nullable |
| `end_date` | DATE | nullable |
| `payload` | JSONB | `FederationMembership` |
| `sync_run_id` | UUID | |
| `fetched_at` | TIMESTAMPTZ | |

---

## `twizzit.shadow_contact`

Twizzit person uniqueness for later analysis: **(first_name, last_name, date_of_birth)** — not a DB unique constraint in v1 (source may violate); index for lookup only.

| Column | Type | Notes |
|--------|------|-------|
| `twizzit_id` | BIGINT PK | `FederationContact.id` (= future `Player.twizzitId`) |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `date_of_birth` | DATE | nullable (Twizzit allows null) |
| `member_id` | TEXT | nullable; extracted `FederationContact.memberId` (Member ID extra field) |
| `gender` | TEXT | nullable |
| `payload` | JSONB | Full `FederationContact` including `extraFields[]` |
| `sync_run_id` | UUID | |
| `fetched_at` | TIMESTAMPTZ | |

**Indexes**:

- `idx_shadow_contact_natural_key` on `(lower(first_name), lower(last_name), date_of_birth)` — supports duplicate detection queries.
- `idx_shadow_contact_member_id` on `member_id` where not null.

---

## Validation rules (ingest)

| Rule | Enforcement |
|------|-------------|
| `twizzit_id` required | Reject row if client returned entity without numeric id |
| Contact identity columns | Populate from `FederationContact`; `date_of_birth` parsed from ISO date string or null |
| `member_id` | From client `memberId` (already extracted from extra fields in 015) |
| Payload round-trip | `payload` = JSON serialisation of the same `Federation*` instance upserted |
| Per-record failure | Log + increment error counter; do not abort run (aligns with F6.3 spirit for future production sync) |
| Page failure | Retry via client; after exhaustion mark run `failed` and persist checkpoint |

---

## Sequelize model files (planned)

```text
libs/backend/database/src/models/twizzit/
├── sync-run.model.ts
├── sync-checkpoint.model.ts
├── shadow-organization.model.ts
├── shadow-extra-field.model.ts
├── shadow-membership-type.model.ts
├── shadow-membership.model.ts
├── shadow-contact.model.ts
└── index.ts
```

No `@ObjectType` decorators. Register models in database module barrel and pass to Sequelize in worker + migration.
