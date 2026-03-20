"use strict";

const path = require("path");
const env = process.env.NODE_ENV || "development";
require("dotenv").config({ path: path.resolve(__dirname, `../../.env.${env}`) });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const {
  SeederContext,
  findOrCreatePlayer,
  addRankingToPlayer,
} = require("./utils/dist");

/**
 * Load admin config from environment.
 *
 * Supported env vars (all optional):
 *   SEED_ADMIN_USER_EMAIL, SEED_ADMIN_FIRST_NAME, SEED_ADMIN_LAST_NAME,
 *   SEED_ADMIN_MEMBER_ID, SEED_ADMIN_GENDER, SEED_ADMIN_USER_AUTH0_SUB
 */
function loadAdminConfig() {
  return {
    email: process.env.SEED_ADMIN_USER_EMAIL || "admin@example.com",
    firstName: process.env.SEED_ADMIN_FIRST_NAME || "Admin",
    lastName: process.env.SEED_ADMIN_LAST_NAME || "User",
    memberId: process.env.SEED_ADMIN_MEMBER_ID || `TEST-ADMIN-${Date.now()}`,
    gender: process.env.SEED_ADMIN_GENDER || "M",
    sub: process.env.SEED_ADMIN_USER_AUTH0_SUB || "",
  };
}

/**
 * Grant all global claims to a player.
 */
async function grantGlobalAdminClaims(sequelize, transaction, QueryTypes, playerId, userEmail) {
  const claims = await sequelize.query(
    `SELECT id, name FROM "security"."Claims" WHERE type = 'global'`,
    { type: QueryTypes.SELECT, transaction }
  );
  for (const claim of claims) {
    const [existing] = await sequelize.query(
      `SELECT 1 FROM "security"."PlayerClaimMemberships" WHERE "playerId" = :playerId AND "claimId" = :claimId`,
      { replacements: { playerId, claimId: claim.id }, type: QueryTypes.SELECT, transaction }
    );
    if (!existing) {
      await sequelize.query(
        `INSERT INTO "security"."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
         VALUES (:playerId, :claimId, NOW(), NOW())`,
        { replacements: { playerId, claimId: claim.id }, transaction }
      );
      console.log(`✅ Granted global claim "${claim.name}" to user (${userEmail})\n`);
    }
  }
  if (claims.length > 0) {
    console.log(`✅ Added ${claims.length} global admin claim(s) for user\n`);
  }
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = Sequelize;
    const config = loadAdminConfig();

    console.log(`🚀 Seeding admin user: ${config.email}\n`);

    try {
      return await sequelize.transaction(async (transaction) => {
        const ctx = new SeederContext(sequelize, QueryTypes, transaction);

        const admin = await findOrCreatePlayer(
          ctx,
          config.email,
          config.firstName,
          config.lastName,
          config.memberId,
          config.gender,
          true,
          config.sub
        );

        await addRankingToPlayer(ctx, admin.id);
        await grantGlobalAdminClaims(sequelize, transaction, QueryTypes, admin.id, config.email);

        console.log("📊 Admin summary:");
        console.log(`   • Admin: ${config.email} (${admin.id})`);
        console.log("   • No club affiliation — global access only");
        console.log("\n✨ Admin seed completed successfully!");
      });
    } catch (error) {
      console.error("❌ Error during admin seeding:", error.message);
      console.error(error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const config = loadAdminConfig();

    console.log(`🧹 Cleaning up admin user: ${config.email}\n`);

    const safeDelete = async (sql, replacements, description) => {
      console.log(`🔍 Attempting: ${description}...`);
      try {
        await sequelize.query(sql, { replacements });
        console.log(`✅ ${description} - completed`);
      } catch (err) {
        console.warn(`⚠️  ${description} - skipped (${err.message})`);
      }
    };

    try {
      const [admin] = await sequelize.query(
        `SELECT id FROM "Players" WHERE email = :email LIMIT 1`,
        { replacements: { email: config.email }, type: Sequelize.QueryTypes.SELECT }
      );

      if (!admin) {
        console.log("ℹ️  Admin user not found, nothing to clean up");
        return;
      }

      const playerId = admin.id;

      await safeDelete(
        `DELETE FROM "security"."PlayerClaimMemberships" WHERE "playerId" = :playerId`,
        { playerId },
        "Deleted admin claim memberships"
      );
      await safeDelete(
        `DELETE FROM ranking."RankingPoints" WHERE "playerId" = :playerId`,
        { playerId },
        "Deleted admin ranking points"
      );
      await safeDelete(
        `DELETE FROM ranking."RankingPlaces" WHERE "playerId" = :playerId`,
        { playerId },
        "Deleted admin ranking places"
      );
      await safeDelete(
        `DELETE FROM ranking."RankingLastPlaces" WHERE "playerId" = :playerId`,
        { playerId },
        "Deleted admin ranking last places"
      );
      await safeDelete(
        `DELETE FROM "Players" WHERE id = :playerId`,
        { playerId },
        "Deleted admin player"
      );

      console.log("\n✅ Admin cleanup completed successfully!");
    } catch (error) {
      console.error("\n❌ FATAL ERROR during admin cleanup:", error.message);
      throw error;
    }
  },
};
