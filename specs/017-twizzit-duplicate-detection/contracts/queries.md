# SQL Query Contracts: Twizzit Duplicate Detection

**Feature**: [spec.md](../spec.md) | **Date**: 2026-05-15

---

## Q1 — Shadow table empty guard

```sql
SELECT COUNT(*)::int AS total FROM twizzit.shadow_contact
```

**Action**: If `total === 0`, print error and exit with code 1.

---

## Q2 — Pass 1: memberId duplicate groups

```sql
SELECT
  sc.twizzit_id,
  sc.member_id                             AS shadow_member_id,
  sc.gender                                AS shadow_gender,
  array_agg(p.id::text   ORDER BY p.id)   AS player_ids,
  array_agg(p."firstName" ORDER BY p.id)  AS first_names,
  array_agg(p."lastName"  ORDER BY p.id)  AS last_names,
  array_agg(p."memberId"  ORDER BY p.id)  AS member_ids,
  array_agg(p."dateOfBirth"::text ORDER BY p.id) AS dobs,
  array_agg(p.gender      ORDER BY p.id)  AS genders,
  array_agg(p.email       ORDER BY p.id)  AS emails
FROM twizzit.shadow_contact sc
JOIN public."Players" p ON p."memberId" = sc.member_id
WHERE sc.member_id IS NOT NULL
  AND p."memberId" IS NOT NULL
GROUP BY sc.twizzit_id, sc.member_id, sc.gender
HAVING COUNT(p.id) > 1
ORDER BY COUNT(p.id) DESC, sc.twizzit_id
```

**groupId prefix**: `MB-{N}`
**matchReason**: `member-id-match`
**missingMemberId**: always `false` (both sides had memberId)

---

## Q3 — Pass 2: natural-key duplicate groups (fallback)

```sql
SELECT
  sc.twizzit_id,
  sc.member_id                             AS shadow_member_id,
  array_agg(p.id::text   ORDER BY p.id)   AS player_ids,
  array_agg(p."firstName" ORDER BY p.id)  AS first_names,
  array_agg(p."lastName"  ORDER BY p.id)  AS last_names,
  array_agg(p."memberId"  ORDER BY p.id)  AS member_ids,
  array_agg(p."dateOfBirth"::text ORDER BY p.id) AS dobs,
  array_agg(p.gender      ORDER BY p.id)  AS genders,
  array_agg(p.email       ORDER BY p.id)  AS emails
FROM twizzit.shadow_contact sc
JOIN public."Players" p
  ON  lower(sc.first_name) = lower(p."firstName")
  AND lower(sc.last_name)  = lower(p."lastName")
  AND sc.date_of_birth IS NOT DISTINCT FROM p."dateOfBirth"
WHERE (sc.member_id IS NULL OR p."memberId" IS NULL)
  AND p.id::text NOT IN ($1)   -- array of player IDs already in Pass 1 groups
GROUP BY sc.twizzit_id, sc.member_id
HAVING COUNT(p.id) > 1
ORDER BY COUNT(p.id) DESC, sc.twizzit_id
```

**Parameters**: `$1` = comma-separated player IDs from Pass 1 (exclude already-found duplicates)
**groupId prefix**: `NK-{N}`
**matchReason**: `natural-key-match`
**missingMemberId**: `true` when `sc.member_id IS NOT NULL AND p."memberId" IS NULL` for that row
**suggestedMemberId**: `sc.member_id` when `missingMemberId = true`
