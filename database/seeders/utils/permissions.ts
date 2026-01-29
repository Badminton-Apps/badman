import { randomUUID } from "crypto";
import { SeederContext } from "./seeder-context";

type RoleSchemaInfo = {
  hasLocked: boolean;
  hasLinkColumns: boolean;
  hasIdDefault: boolean;
};

async function getRoleSchemaInfo(ctx: SeederContext): Promise<RoleSchemaInfo> {
  const columns = await ctx.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'security'
       AND table_name = 'Roles'
       AND column_name IN ('locked', 'linkId', 'linkType', 'clubId', 'type')`
  );
  const columnSet = new Set(columns.map((c) => c.column_name));
  const [idColumn] = await ctx.query<{ column_default: string | null }>(
    `SELECT column_default
     FROM information_schema.columns
     WHERE table_schema = 'security'
       AND table_name = 'Roles'
       AND column_name = 'id'
     LIMIT 1`
  );

  return {
    hasLocked: columnSet.has("locked"),
    hasLinkColumns: columnSet.has("linkId") && columnSet.has("linkType"),
    hasIdDefault: !!idColumn?.column_default,
  };
}


export async function ensureRole(
  ctx: SeederContext,
  {
    name,
    description,
    linkId,
    linkType,
    locked = true,
  }: {
    name: string;
    description: string;
    linkId: string;
    linkType: string;
    locked?: boolean;
  }
): Promise<string> {
  const { hasLocked, hasLinkColumns, hasIdDefault } = await getRoleSchemaInfo(ctx);
  const roleId = hasIdDefault ? undefined : randomUUID();

  const [role] = await ctx.query<{ id: string }>(
    hasLinkColumns
      ? `SELECT id FROM "security"."Roles"
         WHERE name = :name AND "linkId" = :linkId AND "linkType" = :linkType
         LIMIT 1`
      : `SELECT id FROM "security"."Roles"
         WHERE name = :name AND "clubId" = :linkId AND type = :legacyType
         LIMIT 1`,
    {
      name,
      linkId,
      linkType,
      legacyType: linkType?.toUpperCase?.() ?? linkType,
    }
  );

  if (role?.id) {
    return role.id;
  }

  const createdRole = await ctx.insert<{ id: string }>(
    hasLinkColumns
      ? hasLocked
        ? hasIdDefault
          ? `INSERT INTO "security"."Roles" (name, description, locked, "linkId", "linkType", "createdAt", "updatedAt")
             VALUES (:name, :description, :locked, :linkId, :linkType, NOW(), NOW())
             RETURNING id`
          : `INSERT INTO "security"."Roles" (id, name, description, locked, "linkId", "linkType", "createdAt", "updatedAt")
             VALUES (:roleId, :name, :description, :locked, :linkId, :linkType, NOW(), NOW())
             RETURNING id`
        : hasIdDefault
          ? `INSERT INTO "security"."Roles" (name, description, "linkId", "linkType", "createdAt", "updatedAt")
             VALUES (:name, :description, :linkId, :linkType, NOW(), NOW())
             RETURNING id`
          : `INSERT INTO "security"."Roles" (id, name, description, "linkId", "linkType", "createdAt", "updatedAt")
             VALUES (:roleId, :name, :description, :linkId, :linkType, NOW(), NOW())
             RETURNING id`
      : hasIdDefault
        ? `INSERT INTO "security"."Roles" (name, description, "clubId", type, "createdAt", "updatedAt")
           VALUES (:name, :description, :linkId, :legacyType, NOW(), NOW())
           RETURNING id`
        : `INSERT INTO "security"."Roles" (id, name, description, "clubId", type, "createdAt", "updatedAt")
           VALUES (:roleId, :name, :description, :linkId, :legacyType, NOW(), NOW())
           RETURNING id`,
    {
      roleId,
      name,
      description,
      locked,
      linkId,
      linkType,
      legacyType: linkType?.toUpperCase?.() ?? linkType,
    }
  );

  return createdRole.id;
}

export async function ensureClaimId(ctx: SeederContext, name: string): Promise<string> {
  const [claim] = await ctx.query<{ id: string }>(
    `SELECT id FROM "security"."Claims" WHERE name = :name LIMIT 1`,
    { name }
  );

  if (!claim?.id) {
    throw new Error(`Claim "${name}" not found`);
  }

  return claim.id;
}

export async function ensureRoleClaim(
  ctx: SeederContext,
  roleId: string,
  claimId: string
): Promise<void> {
  try {
    const existingRoleClaim = await ctx.query<{ id: string }>(
      `SELECT 1 AS id FROM "security"."RoleClaimMemberships"
       WHERE "roleId" = :roleId AND "claimId" = :claimId
       LIMIT 1`,
      { roleId, claimId }
    );

    if (!existingRoleClaim.length) {
      await ctx.rawQuery(
        `INSERT INTO "security"."RoleClaimMemberships" ("roleId", "claimId", "createdAt", "updatedAt")
         VALUES (:roleId, :claimId, NOW(), NOW())`,
        { roleId, claimId }
      );
    }
  } catch (error: unknown) {
    console.error("❌ Failed to ensure RoleClaimMembership");
    console.error(`   roleId: ${roleId}`);
    console.error(`   claimId: ${claimId}`);
    if (error instanceof Error) {
      console.error(`   message: ${error.message}`);
    } else {
      console.error(`   message: ${String(error)}`);
    }
    if (error && typeof error === "object" && "sql" in error) {
      console.error(`   sql: ${String((error as { sql?: unknown }).sql)}`);
    }
    throw error;
  }
}

export async function ensurePlayerRole(
  ctx: SeederContext,
  playerId: string,
  roleId: string
): Promise<void> {
  try {
    const existingPlayerRole = await ctx.query<{ id: string }>(
      `SELECT 1 AS id FROM "security"."PlayerRoleMemberships"
       WHERE "playerId" = :playerId AND "roleId" = :roleId
       LIMIT 1`,
      { playerId, roleId }
    );

    console.log(
      `✅ Checking if player ${playerId} has role ${roleId} (existingPlayerRole: ${existingPlayerRole.length})\n`
    );
    if (!existingPlayerRole.length) {
      console.log(`✅ Adding player ${playerId} to role ${roleId}\n`);
      await ctx.rawQuery(
        `INSERT INTO "security"."PlayerRoleMemberships" ("playerId", "roleId", "createdAt", "updatedAt")
         VALUES (:playerId, :roleId, NOW(), NOW())`,
        { playerId, roleId }
      );
    }
  } catch (error: unknown) {
    console.error("❌ Failed to ensure PlayerRoleMembership");
    console.error(`   playerId: ${playerId}`);
    console.error(`   roleId: ${roleId}`);
    if (error instanceof Error) {
      console.error(`   message: ${error.message}`);
    } else {
      console.error(`   message: ${String(error)}`);
    }
    if (error && typeof error === "object" && "sql" in error) {
      console.error(`   sql: ${String((error as { sql?: unknown }).sql)}`);
    }
    throw error;
  }
}

export async function ensureClubAdminPermission(
  ctx: SeederContext,
  clubId: string,
  playerId: string
): Promise<void> {
  const roleId = await ensureRole(ctx, {
    name: "Admin",
    description: "Club admin",
    linkId: clubId,
    linkType: "club",
    locked: true,
  });
  console.log(`✅ Created Admin role for club ${clubId} (role ID: ${roleId})\n`);
  const clubClaimId = await ensureClaimId(ctx, "edit:club");
  console.log(`✅ Created edit:club claim (claim ID: ${clubClaimId})\n`);
  await ensureRoleClaim(ctx, roleId, clubClaimId);
  console.log(`✅ Added edit:club claim to Admin role (role ID: ${roleId})\n`);

  const locationClaimId = await ensureClaimId(ctx, "edit:location");
  console.log(`✅ Created edit:location claim (claim ID: ${locationClaimId})\n`);
  await ensureRoleClaim(ctx, roleId, locationClaimId);
  console.log(`✅ Added edit:location claim to Admin role (role ID: ${roleId})\n`);
  await ensurePlayerRole(ctx, playerId, roleId);
  console.log(`✅ Added Admin role to player (player ID: ${playerId})\n`);
}
