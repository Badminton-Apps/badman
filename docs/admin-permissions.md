# Admin Permissions

How to manage global admin permissions directly in the database. Useful for local development and testing.

## Tables involved

- `"Players"` — user accounts (identified by `email`)
- `"security"."Claims"` — permission definitions (e.g. `change:enrollment`). The `type` column is `'global'` or `'GLOBAL'` for admin-level claims.
- `"security"."PlayerClaimMemberships"` — links players to claims

## Grant all global admin claims to a user

```sql
INSERT INTO "security"."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT p.id, c.id, NOW(), NOW()
FROM "Players" p
CROSS JOIN "security"."Claims" c
WHERE p.email = 'your-email@example.com'
  AND LOWER(c.type) = 'global'
  AND NOT EXISTS (
    SELECT 1 FROM "security"."PlayerClaimMemberships" pcm
    WHERE pcm."playerId" = p.id AND pcm."claimId" = c.id
  );
```

## Grant a specific claim

```sql
INSERT INTO "security"."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT p.id, c.id, NOW(), NOW()
FROM "Players" p
CROSS JOIN "security"."Claims" c
WHERE p.email = 'your-email@example.com'
  AND c.name = 'change:enrollment'
  AND NOT EXISTS (
    SELECT 1 FROM "security"."PlayerClaimMemberships" pcm
    WHERE pcm."playerId" = p.id AND pcm."claimId" = c.id
  );
```

## Check which permissions a user has

```sql
SELECT p.email, c.name, c.type
FROM "security"."PlayerClaimMemberships" pcm
JOIN "Players" p ON p.id = pcm."playerId"
JOIN "security"."Claims" c ON c.id = pcm."claimId"
WHERE p.email = 'your-email@example.com'
ORDER BY c.type, c.name;
```

## Revoke all global claims from a user

```sql
DELETE FROM "security"."PlayerClaimMemberships"
WHERE "playerId" = (SELECT id FROM "Players" WHERE email = 'your-email@example.com')
  AND "claimId" IN (SELECT id FROM "security"."Claims" WHERE LOWER(type) = 'global');
```

## Revoke a specific claim

```sql
DELETE FROM "security"."PlayerClaimMemberships"
WHERE "playerId" = (SELECT id FROM "Players" WHERE email = 'your-email@example.com')
  AND "claimId" = (SELECT id FROM "security"."Claims" WHERE name = 'change:enrollment');
```

## List all available global claims

```sql
SELECT name, description, type FROM "security"."Claims"
WHERE LOWER(type) = 'global'
ORDER BY name;
```
