# Permissions Playbook

How to manually grant or revoke permissions for a user directly in the database.

## Schema overview

```
"Players"                         — player records (identified by email)
security."Claims"                 — available permission claims
security."PlayerClaimMemberships" — junction: which player has which claim
```

Claims have a `type` of `global`, `club`, `team`, `competition`, or `tournament`.

---

## Step 1 — Find the player ID

```sql
SELECT id, email, "firstName", "lastName"
FROM "Players"
WHERE email = 'user@example.com';
```

---

## Step 2 — See what claims exist

### All global claims (system-wide admin permissions)

```sql
SELECT id, name, description
FROM security."Claims"
WHERE type = 'global'
ORDER BY name;
```

### All club-level claims

```sql
SELECT id, name, description
FROM security."Claims"
WHERE type = 'club'
ORDER BY name;
```

### All claims (every type)

```sql
SELECT id, name, type, description
FROM security."Claims"
ORDER BY type, name;
```

Known claim names as of 2026-03-23:

| Name | Type | Purpose |
|---|---|---|
| `change:enrollment` | global | Open/close enrollment settings |
| `change:rules` | global | Edit ranking rules |
| `change:transfer` | global | Accept/reject player transfers |
| `edit:faq` | global | Edit FAQ content |
| `edit:state` | global | Edit province/state data |
| `edit:system-settings` | global | Edit system settings |
| `enlist-any-event:team` | global | Enlist any team into any event |
| `export-exceptions:competition` | global | Export competition exceptions |
| `export-locations:competition` | global | Export competition locations |
| `export-planner:competition` | global | Export competition planner |
| `export-teams:competition` | global | Export competition teams |
| `re-sync:points` | global | Re-sync ranking points |
| `sync:competition` | global | Sync competition data |
| `sync:tournament` | global | Sync tournament data |
| `view-any:enrollment-competition` | global | View any club's enrollment |
| `view-any:enrollment-tournament` | global | View any club's tournament enrollment |
| `add:faq` | global | Add FAQ entries |
| `edit:club` | club | Edit own club |
| `edit-any:club` | club | Edit any club |
| `view:enrollment-competition` | club | View own club's enrollment |
| `view:enrollment-tournament` | club | View own club's tournament enrollment |

> **Note:** Always run the Step 2 query to get the current list — new claims are added via migrations.

---

## Step 3 — See what a user currently has

```sql
SELECT c.name, c.type, c.description
FROM security."PlayerClaimMemberships" pcm
JOIN security."Claims" c ON c.id = pcm."claimId"
WHERE pcm."playerId" = '<player-uuid>'
ORDER BY c.type, c.name;
```

---

## Step 4 — Grant a permission

### Grant a specific claim

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE name = 'change:enrollment'
ON CONFLICT DO NOTHING;
```

### Grant all global claims (full admin)

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE type = 'global'
ON CONFLICT DO NOTHING;
```

> `ON CONFLICT DO NOTHING` makes these safe to run multiple times.

---

## Step 5 — Revoke a permission

### Revoke a specific claim

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = '<player-uuid>'
  AND "claimId" = (SELECT id FROM security."Claims" WHERE name = 'change:enrollment');
```

### Revoke all claims from a user

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = '<player-uuid>';
```

---

## Full example: make a user a global admin

```sql
-- 1. Find the player
SELECT id, email FROM "Players" WHERE email = 'user@example.com';

-- 2. Grant all global claims (replace the UUID)
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE type = 'global'
ON CONFLICT DO NOTHING;

-- 3. Verify
SELECT c.name FROM security."PlayerClaimMemberships" pcm
JOIN security."Claims" c ON c.id = pcm."claimId"
WHERE pcm."playerId" = '<player-uuid>'
ORDER BY c.name;
```

---

## Notes

- Permissions take effect immediately — no restart needed.
- The `PlayerClaimMemberships` table has no `clubId` column. Club-scoped claims (`type = 'club'`) are still granted globally to the player — the app resolves club context from club membership.
- To automate this for a fresh environment, use `npm run seed:admin` which grants all global claims to the configured admin user.
