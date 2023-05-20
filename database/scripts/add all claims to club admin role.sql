

-- Delete existing role claim memberships
DELETE FROM "security"."RoleClaimMemberships" where "roleId" in (
  SELECT id
 FROM "security"."Roles"
  WHERE "name" = 'Admin'
    AND "linkType" = 'club'
);

-- Retrieve roles with name "Admin" and linkType "club"
WITH admin_roles AS (
  SELECT id
  FROM "security"."Roles"
  WHERE "name" = 'Admin'
    AND "linkType" = 'club'
)
-- Insert new role claim memberships
INSERT INTO "security"."RoleClaimMemberships" ("roleId", "claimId", "createdAt", "updatedAt")
SELECT admin_roles.id, "security"."Claims".id, NOW(), NOW()
FROM admin_roles, "security"."Claims"
WHERE "security"."Claims"."type" IN ('club', 'team');

-- set locked to true
update "security"."Roles" set locked = true where "name" = 'Admin';
