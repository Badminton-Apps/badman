"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRole = ensureRole;
exports.ensureClaimId = ensureClaimId;
exports.ensureRoleClaim = ensureRoleClaim;
exports.ensurePlayerRole = ensurePlayerRole;
exports.ensureClubAdminPermission = ensureClubAdminPermission;
const crypto_1 = require("crypto");
async function ensureRole(ctx, { name, description, linkId, linkType, locked = true, }) {
    const columns = await ctx.query(`SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'security'
       AND table_name = 'Roles'
       AND column_name IN ('locked', 'linkId', 'linkType', 'clubId', 'type')`);
    const columnSet = new Set(columns.map((c) => c.column_name));
    const hasLocked = columnSet.has("locked");
    const hasLinkColumns = columnSet.has("linkId") && columnSet.has("linkType");
    const [idColumn] = await ctx.query(`SELECT column_default
     FROM information_schema.columns
     WHERE table_schema = 'security'
       AND table_name = 'Roles'
       AND column_name = 'id'
     LIMIT 1`);
    const hasIdDefault = !!idColumn?.column_default;
    const roleId = hasIdDefault ? undefined : (0, crypto_1.randomUUID)();
    const [role] = await ctx.query(hasLinkColumns
        ? `SELECT id FROM "security"."Roles"
         WHERE name = :name AND "linkId" = :linkId AND "linkType" = :linkType
         LIMIT 1`
        : `SELECT id FROM "security"."Roles"
         WHERE name = :name AND "clubId" = :linkId AND type = :legacyType
         LIMIT 1`, {
        name,
        linkId,
        linkType,
        legacyType: linkType?.toUpperCase?.() ?? linkType,
    });
    if (role?.id) {
        return role.id;
    }
    const createdRole = await ctx.insert(hasLinkColumns
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
           RETURNING id`, {
        roleId,
        name,
        description,
        locked,
        linkId,
        linkType,
        legacyType: linkType?.toUpperCase?.() ?? linkType,
    });
    return createdRole.id;
}
async function ensureClaimId(ctx, name) {
    const [claim] = await ctx.query(`SELECT id FROM "security"."Claims" WHERE name = :name LIMIT 1`, { name });
    if (!claim?.id) {
        throw new Error(`Claim "${name}" not found`);
    }
    return claim.id;
}
async function ensureRoleClaim(ctx, roleId, claimId) {
    try {
        const existingRoleClaim = await ctx.query(`SELECT 1 AS id FROM "security"."RoleClaimMemberships"
       WHERE "roleId" = :roleId AND "claimId" = :claimId
       LIMIT 1`, { roleId, claimId });
        if (!existingRoleClaim.length) {
            await ctx.rawQuery(`INSERT INTO "security"."RoleClaimMemberships" ("roleId", "claimId", "createdAt", "updatedAt")
         VALUES (:roleId, :claimId, NOW(), NOW())`, { roleId, claimId });
        }
    }
    catch (error) {
        console.error("❌ Failed to ensure RoleClaimMembership");
        console.error(`   roleId: ${roleId}`);
        console.error(`   claimId: ${claimId}`);
        if (error instanceof Error) {
            console.error(`   message: ${error.message}`);
        }
        else {
            console.error(`   message: ${String(error)}`);
        }
        if (error && typeof error === "object" && "sql" in error) {
            console.error(`   sql: ${String(error.sql)}`);
        }
        throw error;
    }
}
async function ensurePlayerRole(ctx, playerId, roleId) {
    try {
        const existingPlayerRole = await ctx.query(`SELECT 1 AS id FROM "security"."PlayerRoleMemberships"
       WHERE "playerId" = :playerId AND "roleId" = :roleId
       LIMIT 1`, { playerId, roleId });
        console.log(`✅ Checking if player ${playerId} has role ${roleId} (existingPlayerRole: ${existingPlayerRole.length})\n`);
        if (!existingPlayerRole.length) {
            console.log(`✅ Adding player ${playerId} to role ${roleId}\n`);
            await ctx.rawQuery(`INSERT INTO "security"."PlayerRoleMemberships" ("playerId", "roleId", "createdAt", "updatedAt")
         VALUES (:playerId, :roleId, NOW(), NOW())`, { playerId, roleId });
        }
    }
    catch (error) {
        console.error("❌ Failed to ensure PlayerRoleMembership");
        console.error(`   playerId: ${playerId}`);
        console.error(`   roleId: ${roleId}`);
        if (error instanceof Error) {
            console.error(`   message: ${error.message}`);
        }
        else {
            console.error(`   message: ${String(error)}`);
        }
        if (error && typeof error === "object" && "sql" in error) {
            console.error(`   sql: ${String(error.sql)}`);
        }
        throw error;
    }
}
async function ensureClubAdminPermission(ctx, clubId, playerId) {
    const roleId = await ensureRole(ctx, {
        name: "Admin",
        description: "Club admin",
        linkId: clubId,
        linkType: "club",
        locked: true,
    });
    console.log(`✅ Created Admin role for club ${clubId} (role ID: ${roleId})\n`);
    const claimId = await ensureClaimId(ctx, "edit:club");
    console.log(`✅ Created edit:club claim (claim ID: ${claimId})\n`);
    await ensureRoleClaim(ctx, roleId, claimId);
    console.log(`✅ Added edit:club claim to Admin role (role ID: ${roleId})\n`);
    await ensurePlayerRole(ctx, playerId, roleId);
    console.log(`✅ Added Admin role to player (player ID: ${playerId})\n`);
}
