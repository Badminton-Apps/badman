# Data Model: Twizzit Duplicate Detection

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-15

This script is **read-only** — no new tables, columns, or migrations. It reads two existing sources and writes a local CSV.

---

## Source tables (read-only)

### `twizzit.shadow_contact` (spec 016)

| Column | Type | Role |
|--------|------|------|
| `twizzit_id` | BIGINT | Group key — duplicate = 2+ Players match same `twizzit_id` |
| `first_name` | TEXT | Fallback natural-key match (`lower()`) |
| `last_name` | TEXT | Fallback natural-key match (`lower()`) |
| `date_of_birth` | DATE | Fallback natural-key match (nullable, `IS NOT DISTINCT FROM`) |
| `member_id` | TEXT | **Primary match key**; also used as `suggestedMemberId` when Player is missing it |
| `gender` | TEXT | Output column |

Indexes leveraged: `idx_shadow_contact_member_id`, `idx_shadow_contact_natural_key`.

### `public."Players"` (existing)

| Column | Type | Role |
|--------|------|------|
| `id` | UUID | Output `badmanPlayerId` |
| `"firstName"` | VARCHAR | Fallback natural-key match (`lower()`) |
| `"lastName"` | VARCHAR | Fallback natural-key match (`lower()`) |
| `"dateOfBirth"` | DATE | Fallback natural-key match (nullable) |
| `"memberId"` | VARCHAR | **Primary match key**; null triggers fallback |
| `gender` | VARCHAR | Output column |
| `email` | VARCHAR | Output column |

---

## Output: CSV row shape

File: `scripts/duplicate-report-<env>-<YYYY-MM-DD>.csv`
One row per Badman Player per duplicate group.

| Column | Source | Notes |
|--------|--------|-------|
| `groupId` | Assigned | `MB-N` (memberId match) or `NK-N` (natural-key match) |
| `matchReason` | Assigned | `member-id-match` or `natural-key-match` |
| `twizzitId` | `shadow_contact.twizzit_id` | Twizzit contact that confirmed these Players are the same person |
| `memberId` | `Players."memberId"` | The Player's current memberId (may be empty) |
| `badmanPlayerId` | `Players.id` | UUID of the Badman Player row |
| `firstName` | `Players."firstName"` | |
| `lastName` | `Players."lastName"` | |
| `dateOfBirth` | `Players."dateOfBirth"` | ISO date or empty |
| `gender` | `Players.gender` | |
| `email` | `Players.email` | |
| `missingMemberId` | Computed | `true` when Player has no memberId but shadow contact does |
| `suggestedMemberId` | `shadow_contact.member_id` | Populated when `missingMemberId = true`; empty otherwise |

---

## Detection logic

### Pass 1 — memberId match (groups prefixed `MB-`)

```
JOIN twizzit.shadow_contact sc ON sc.member_id = p."memberId"
WHERE sc.member_id IS NOT NULL AND p."memberId" IS NOT NULL
GROUP BY sc.twizzit_id
HAVING COUNT(p.id) > 1
→ Each group = duplicate Badman Players sharing the same Twizzit identity
```

### Pass 2 — Natural-key match (groups prefixed `NK-`, fallback only)

```
JOIN twizzit.shadow_contact sc ON
  lower(sc.first_name) = lower(p."firstName")
  AND lower(sc.last_name) = lower(p."lastName")
  AND sc.date_of_birth IS NOT DISTINCT FROM p."dateOfBirth"
WHERE (sc.member_id IS NULL OR p."memberId" IS NULL)
  AND p.id NOT IN (players already found in Pass 1)
GROUP BY sc.twizzit_id
HAVING COUNT(p.id) > 1
→ Each group = duplicate Badman Players confirmed by name+DOB
→ Flag rows where sc.member_id IS NOT NULL but p."memberId" IS NULL
```

---

## No new migrations

No schema changes. All tables consumed are owned by specs 015/016.
