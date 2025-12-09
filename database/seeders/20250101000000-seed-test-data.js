"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Note: This seeder uses raw Sequelize queries because Sequelize CLI seeders
// don't easily support TypeScript models with decorators.
// For a better solution, consider using a NestJS command (see apps/scripts)

const {
  SeederContext,
  findOrCreatePlayer,
  createClub,
  addPlayerToClub,
  createTeam,
  addPlayerToTeam,
  createEventCompetition,
  createSubEventCompetition,
  createDrawCompetition,
  createOpponentTeam,
  createEncounters,
} = require("./utils/dist");

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = Sequelize;

    // Get user email from environment variable (optional)
    const userEmail = process.env.SEED_USER_EMAIL || "test@example.com";
    const firstName = process.env.SEED_FIRST_NAME || "Test";
    const lastName = process.env.SEED_LAST_NAME || "User";
    const memberId = process.env.SEED_MEMBER_ID || `TEST-${Date.now()}`;
    const gender = process.env.SEED_GENDER || "M";

    console.log(`🚀 Starting seed for user: ${userEmail}\n`);

    try {
      return await sequelize.transaction(async (transaction) => {
        // Create seeder context
        const ctx = new SeederContext(sequelize, QueryTypes, transaction);

        // Get current season (September to April)
        const now = new Date();
        const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        console.log(`📅 Using season: ${season}\n`);

        // Find or create player
        const user = await findOrCreatePlayer(
          ctx,
          userEmail,
          firstName,
          lastName,
          memberId,
          gender
        );

        // Create first club (user's club)
        const clubId = await createClub(ctx, "TEAM AWESOME");

        // Add player to club
        await addPlayerToClub(ctx, clubId, user.id);

        // Verify transaction is still valid by running a simple query
        await ctx.verifyTransaction();
        console.log("✅ Transaction is still valid after adding player to club\n");

        // Create team
        const teamId = await createTeam(ctx, clubId, season, user.id);

        // Add player to team
        await addPlayerToTeam(ctx, teamId, user.id);

        // Create event competition
        const eventId = await createEventCompetition(ctx, season);

        // Create sub event competition
        const subEventId = await createSubEventCompetition(ctx, eventId);

        // Create draw competition
        const drawId = await createDrawCompetition(ctx, subEventId, season);

        // Create second club (opponent club)
        const opponentClubId = await createClub(ctx, "THE OPPONENTS");

        // Create opponent team (in the second club)
        const opponentTeamId = await createOpponentTeam(ctx, opponentClubId, season);

        // Create encounters
        await createEncounters(ctx, drawId, teamId, opponentTeamId, season);

        console.log("📊 Summary:");
        console.log(`   • Club: TEAM AWESOME (${clubId})`);
        console.log(`   • Team: ${teamId}`);
        console.log(`   • Opponent Club: THE OPPONENTS (${opponentClubId})`);
        console.log(`   • Opponent Team: ${opponentTeamId}`);
        console.log(`   • Event: Test Event ${season} (${eventId})`);
        console.log(`   • SubEvent: Test SubEvent M (${subEventId})`);
        console.log(`   • Draw: Test Draw (${drawId})`);
        console.log(`   • Encounters: 10`);
        console.log("\n✨ Seed completed successfully!");
      });
    } catch (error) {
      console.error("❌ Error during seeding:", error.message);
      console.error(error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Cleanup: Remove test data
    const sequelize = queryInterface.sequelize;
    const userEmail = process.env.SEED_USER_EMAIL || "test@example.com";
    const memberId = process.env.SEED_MEMBER_ID || `TEST-${Date.now()}`;

    console.log(`🧹 Cleaning up seed data for user: ${userEmail}\n`);

    return sequelize.transaction(async (transaction) => {
      // Find all test clubs (both user's club and opponent club)
      // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
      const clubs = await sequelize.query(
        `SELECT DISTINCT c.id FROM "Clubs" c
         WHERE c.name IN ('TEAM AWESOME', 'THE OPPONENTS')
         ORDER BY c."createdAt" ASC`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (clubs && clubs.length > 0) {
        const clubIds = clubs.map((c) => c.id);

        try {
          // Delete encounters
          await sequelize.query(
            `DELETE FROM event."EncounterCompetitions" 
             WHERE "drawId" IN (
               SELECT id FROM event."DrawCompetitions" 
               WHERE "subeventId" IN (
                 SELECT id FROM event."SubEventCompetitions" 
                 WHERE "eventId" IN (
                   SELECT id FROM event."EventCompetitions" 
                   WHERE "visualCode" LIKE 'TEST-%'
                 )
               )
             )`,
            { transaction }
          );

          // Delete draws
          await sequelize.query(
            `DELETE FROM event."DrawCompetitions" 
             WHERE "subeventId" IN (
               SELECT id FROM event."SubEventCompetitions" 
               WHERE "eventId" IN (
                 SELECT id FROM event."EventCompetitions" 
                 WHERE "visualCode" LIKE 'TEST-%'
               )
             )`,
            { transaction }
          );

          // Delete sub events
          await sequelize.query(
            `DELETE FROM event."SubEventCompetitions" 
             WHERE "eventId" IN (
               SELECT id FROM event."EventCompetitions" 
               WHERE "visualCode" LIKE 'TEST-%'
             )`,
            { transaction }
          );

          // Delete events
          await sequelize.query(
            `DELETE FROM event."EventCompetitions" WHERE "visualCode" LIKE 'TEST-%'`,
            { transaction }
          );

          // Delete teams for all test clubs
          await sequelize.query(`DELETE FROM "Teams" WHERE "clubId" = ANY(:clubIds)`, {
            replacements: { clubIds },
            transaction,
          });

          // Delete club memberships for all test clubs
          await sequelize.query(
            `DELETE FROM "ClubPlayerMemberships" WHERE "clubId" = ANY(:clubIds)`,
            {
              replacements: { clubIds },
              transaction,
            }
          );

          // Delete all test clubs
          await sequelize.query(`DELETE FROM "Clubs" WHERE id = ANY(:clubIds)`, {
            replacements: { clubIds },
            transaction,
          });

          // Optionally delete the test player if it was created by this seeder
          // Only delete if memberId starts with "TEST-"
          if (memberId && memberId.startsWith("TEST-")) {
            await sequelize.query(
              `DELETE FROM "Players" WHERE email = :email AND "memberId" = :memberId`,
              {
                replacements: { email: userEmail, memberId },
                transaction,
              }
            );
            console.log("✅ Deleted test player");
          }

          console.log("✅ Cleanup completed");
        } catch (err) {
          console.error("❌ Error during cleanup:");
          console.error("  Message:", err.message);
          console.error("  Code:", err.parent?.code);
          console.error("  Detail:", err.parent?.detail);
          console.error("  Constraint:", err.parent?.constraint);
          console.error("  SQL:", err.sql);
          console.error("  Full error:", JSON.stringify(err, null, 2));
          throw err;
        }
      } else {
        console.log("ℹ️  No test data found to clean up");
      }
    });
  },
};
