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
  PlayerFactory,
  addRankingToPlayer,
} = require("./utils/dist");

const PLAYERS_ON_TEAM = 8;
/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = Sequelize;

    // Get user email from environment variable (optional)
    const userEmail = process.env.SEED_HOMETEAM_USER_EMAIL || "test@example.com";
    const firstName = process.env.SEED_HOMETEAM_FIRST_NAME || "Test";
    const lastName = process.env.SEED_HOMETEAM_LAST_NAME || "User";
    const memberId = process.env.SEED_HOMETEAM_MEMBER_ID || `TEST-${Date.now()}`;
    const gender = process.env.SEED_HOMETEAM_GENDER || "M";
    const sub = process.env.SEED_HOMETEAM_USER_AUTH0_SUB || "";

    // Get opponent user email from environment variable (optional)
    const opponentUserEmail = process.env.SEED_AWAYTEAM_USER_EMAIL || "opponent@example.com";
    const opponentFirstName = process.env.SEED_AWAYTEAM_FIRST_NAME || "Opponent";
    const opponentLastName = process.env.SEED_AWAYTEAM_LAST_NAME || "User";
    const opponentMemberId = process.env.SEED_AWAYTEAM_MEMBER_ID || `TEST-OPPONENT-${Date.now()}`;
    const opponentGender = process.env.SEED_AWAYTEAM_GENDER || "M";
    const opponentSub = process.env.SEED_AWAYTEAM_USER_AUTH0_SUB || "";

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
          gender,
          true, // competitionPlayer,
          sub
        );

        // Add ranking to user player
        await addRankingToPlayer(ctx, user.id);

        // Create first club (user's club)
        const clubId = await createClub(ctx, "TEAM AWESOME");

        // Create additional players for TEAM AWESOME (need 5 total, user is 1, so create 4 more)
        const teamAwesomePlayers = [user];
        const additionalPlayers = await PlayerFactory.createForTeam(
          ctx,
          "TEAM AWESOME",
          PLAYERS_ON_TEAM,
          {
            gender: "mixed",
            domain: "teamawesome.com",
            prefix: "TEST-AWESOME",
            baseIndex: 0,
          }
        );

        // Add all additional players to club
        for (const player of additionalPlayers) {
          teamAwesomePlayers.push(player);
          await addPlayerToClub(ctx, clubId, player.id);
        }

        // Add user to club (if not already added)
        await addPlayerToClub(ctx, clubId, user.id);

        // Verify transaction is still valid by running a simple query
        await ctx.verifyTransaction();
        console.log("✅ Transaction is still valid after adding players to club\n");

        // Create team
        const teamId = await createTeam(ctx, clubId, season, user.id);

        // Add all players to team
        for (const player of teamAwesomePlayers) {
          await addPlayerToTeam(ctx, teamId, player.id);
        }
        console.log(`✅ Added ${teamAwesomePlayers.length} players to TEAM AWESOME\n`);

        // Create event competition
        const eventId = await createEventCompetition(ctx, season);

        // Create sub event competition
        const subEventId = await createSubEventCompetition(ctx, eventId);

        // Create draw competition
        const drawId = await createDrawCompetition(ctx, subEventId, season);

        // Create second club (opponent club)
        const opponentClubId = await createClub(ctx, "THE OPPONENTS");

        // Find or create opponent user player
        const opponentUser = await findOrCreatePlayer(
          ctx,
          opponentUserEmail,
          opponentFirstName,
          opponentLastName,
          opponentMemberId,
          opponentGender,
          true, // competitionPlayer,
          opponentSub
        );

        // Add ranking to opponent user player
        await addRankingToPlayer(ctx, opponentUser.id);

        // Create players for THE OPPONENTS (need 4 more players, opponent user is 1, so create 4 more)
        const opponentPlayers = [opponentUser];
        const additionalOpponentPlayers = await PlayerFactory.createForTeam(
          ctx,
          "THE OPPONENTS",
          PLAYERS_ON_TEAM,
          {
            gender: "mixed",
            domain: "opponents.com",
            prefix: "TEST-OPPONENTS",
            baseIndex: 4, // Start from index 4 to avoid name collisions
          }
        );

        // Add all additional players to opponent club
        for (const player of additionalOpponentPlayers) {
          opponentPlayers.push(player);
          await addPlayerToClub(ctx, opponentClubId, player.id);
        }

        // Add opponent user to club (if not already added)
        await addPlayerToClub(ctx, opponentClubId, opponentUser.id);

        // Create opponent team (in the second club) - use opponent user as captain
        const opponentTeamId = await createOpponentTeam(ctx, opponentClubId, season);

        // Add all players to opponent team
        for (const player of opponentPlayers) {
          await addPlayerToTeam(ctx, opponentTeamId, player.id);
        }
        console.log(
          `✅ Added ${opponentPlayers.length} players to THE OPPONENTS (including user: ${opponentUserEmail})\n`
        );

        // Create encounters
        await createEncounters(ctx, drawId, teamId, opponentTeamId, season);

        console.log("📊 Summary:");
        console.log(`   • Club: TEAM AWESOME (${clubId})`);
        console.log(`   • Team: ${teamId} with ${teamAwesomePlayers.length} players`);
        console.log(`   • User: ${userEmail}`);
        console.log(`   • Opponent Club: THE OPPONENTS (${opponentClubId})`);
        console.log(`   • Opponent Team: ${opponentTeamId} with ${opponentPlayers.length} players`);
        console.log(`   • Opponent User: ${opponentUserEmail}`);
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
    const opponentUserEmail = process.env.SEED_OPPONENT_USER_EMAIL || "opponent@example.com";

    console.log(`🧹 Cleaning up seed data for users: ${userEmail} and ${opponentUserEmail}\n`);
    console.log("📍 Step 1: Starting cleanup process...\n");

    // Helper function to safely execute a delete query (without transaction)
    // We don't use transactions for cleanup to avoid "transaction aborted" errors
    const safeDelete = async (sql, replacements, description) => {
      console.log(`🔍 Attempting: ${description}...`);
      try {
        const result = await sequelize.query(sql, {
          replacements,
        });
        console.log(`✅ ${description} - completed`);
        return result;
      } catch (err) {
        console.error(`❌ ${description} - ERROR occurred:`);
        console.error(`   Error message: ${err.message}`);
        console.error(`   Error code: ${err.code}`);
        console.error(`   Error detail: ${err.detail || "N/A"}`);
        if (err.sql) {
          console.error(`   SQL: ${err.sql.substring(0, 200)}...`);
        }

        // If it's a "no rows affected" or "does not exist" error, that's okay
        if (
          err.message?.includes("does not exist") ||
          err.message?.includes("violates foreign key constraint") ||
          err.code === "42P01" || // undefined_table
          err.code === "23503" // foreign_key_violation
        ) {
          console.log(`ℹ️  ${description} - skipped (data may not exist or has dependencies)`);
          return null;
        }
        // For other errors, log but don't throw - continue cleanup
        console.warn(`⚠️  ${description} - continuing despite error`);
        return null;
      }
    };

    try {
      console.log("📍 Step 2: Finding test clubs...\n");
      // Find all test clubs (both user's club and opponent club)
      // Note: Added createdAt to SELECT for ORDER BY compatibility with DISTINCT
      const clubs = await sequelize.query(
        `SELECT DISTINCT c.id, c."createdAt" FROM "Clubs" c
         WHERE c.name IN ('TEAM AWESOME', 'THE OPPONENTS')
         ORDER BY c."createdAt" ASC`,
        {
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      console.log(`📍 Found ${clubs?.length || 0} test clubs\n`);

      if (clubs && clubs.length > 0) {
        const clubIds = clubs.map((c) => c.id);
        console.log(`📍 Step 3: Starting deletion process for ${clubIds.length} clubs...\n`);

        // Build placeholders for IN clause (e.g., :clubId0, :clubId1, ...)
        const clubPlaceholders = clubIds.map((_, index) => `:clubId${index}`).join(", ");
        const clubReplacements = clubIds.reduce((acc, id, index) => {
          acc[`clubId${index}`] = id;
          return acc;
        }, {});

        console.log("📍 Step 3.1: Deleting encounters...\n");
        // Delete encounters
        await safeDelete(
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
          {},
          "Deleted encounters"
        );

        console.log("📍 Step 3.2: Deleting draws...\n");
        // Delete draws
        await safeDelete(
          `DELETE FROM event."DrawCompetitions" 
           WHERE "subeventId" IN (
             SELECT id FROM event."SubEventCompetitions" 
             WHERE "eventId" IN (
               SELECT id FROM event."EventCompetitions" 
               WHERE "visualCode" LIKE 'TEST-%'
             )
           )`,
          {},
          "Deleted draws"
        );

        console.log("📍 Step 3.3: Deleting sub events...\n");
        // Delete sub events
        await safeDelete(
          `DELETE FROM event."SubEventCompetitions" 
           WHERE "eventId" IN (
             SELECT id FROM event."EventCompetitions" 
             WHERE "visualCode" LIKE 'TEST-%'
           )`,
          {},
          "Deleted sub events"
        );

        console.log("📍 Step 3.4: Deleting events...\n");
        // Delete events
        await safeDelete(
          `DELETE FROM event."EventCompetitions" WHERE "visualCode" LIKE 'TEST-%'`,
          {},
          "Deleted events"
        );

        console.log("📍 Step 3.5: Deleting team memberships...\n");
        // Delete team memberships for all test clubs
        await safeDelete(
          `DELETE FROM "TeamPlayerMemberships" 
           WHERE "teamId" IN (
             SELECT id FROM "Teams" WHERE "clubId" IN (${clubPlaceholders})
           )`,
          clubReplacements,
          "Deleted team memberships"
        );

        console.log("📍 Step 3.6: Deleting teams...\n");
        // Delete teams for all test clubs
        await safeDelete(
          `DELETE FROM "Teams" WHERE "clubId" IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted teams"
        );

        console.log("📍 Step 3.7: Deleting club memberships...\n");
        // Delete club memberships for all test clubs
        await safeDelete(
          `DELETE FROM "ClubPlayerMemberships" WHERE "clubId" IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted club memberships"
        );

        console.log("📍 Step 3.8: Deleting clubs...\n");
        // Delete all test clubs
        await safeDelete(
          `DELETE FROM "Clubs" WHERE id IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted clubs"
        );

        console.log("📍 Step 3.9: Finding test players before cleanup...\n");
        // Find test players first to get their IDs for ranking cleanup
        const testPlayers = await sequelize.query(
          `SELECT id FROM "Players" 
           WHERE ("memberId" LIKE 'TEST-%' OR email LIKE '%@teamawesome.com' OR email LIKE '%@opponents.com')
           AND (email = :userEmail OR email = :opponentUserEmail OR "memberId" LIKE 'TEST-%')`,
          {
            replacements: { userEmail, opponentUserEmail },
            type: Sequelize.QueryTypes.SELECT,
          }
        );
        console.log(`📍 Found ${testPlayers?.length || 0} test players\n`);

        if (testPlayers && testPlayers.length > 0) {
          const playerIds = testPlayers.map((p) => p.id);
          const playerPlaceholders = playerIds.map((_, index) => `:playerId${index}`).join(", ");
          const playerReplacements = playerIds.reduce((acc, id, index) => {
            acc[`playerId${index}`] = id;
            return acc;
          }, {});

          console.log("📍 Step 3.9.1: Deleting ranking points...\n");
          // Delete ranking points for test players
          await safeDelete(
            `DELETE FROM ranking."RankingPoints" WHERE "playerId" IN (${playerPlaceholders})`,
            playerReplacements,
            "Deleted ranking points"
          );

          console.log("📍 Step 3.9.2: Deleting ranking places...\n");
          // Delete ranking places for test players
          await safeDelete(
            `DELETE FROM ranking."RankingPlaces" WHERE "playerId" IN (${playerPlaceholders})`,
            playerReplacements,
            "Deleted ranking places"
          );

          console.log("📍 Step 3.9.3: Deleting ranking last places...\n");
          // Delete ranking last places for test players
          await safeDelete(
            `DELETE FROM ranking."RankingLastPlaces" WHERE "playerId" IN (${playerPlaceholders})`,
            playerReplacements,
            "Deleted ranking last places"
          );

          console.log("📍 Step 3.9.4: Deleting test players...\n");
          // Delete test players
          await safeDelete(
            `DELETE FROM "Players" WHERE id IN (${playerPlaceholders})`,
            playerReplacements,
            "Deleted test players"
          );
        } else {
          console.log("ℹ️  No test players found to delete\n");
        }

        console.log("\n✅ Cleanup completed successfully!");
      } else {
        console.log("ℹ️  No test data found to clean up");
      }
    } catch (error) {
      console.error("\n❌ FATAL ERROR during cleanup:");
      console.error(`   Message: ${error.message}`);
      console.error(`   Code: ${error.code || "N/A"}`);
      console.error(`   Detail: ${error.detail || "N/A"}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.substring(0, 500)}...`);
      }
      // Don't throw - allow cleanup to complete even if there are errors
      console.log("\n⚠️  Some cleanup operations may have failed, but continuing...");
    }
  },
};
