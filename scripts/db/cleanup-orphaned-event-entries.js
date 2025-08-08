#!/usr/bin/env node

/**
 * Standalone script to clean up orphaned EventEntry records
 *
 * This script removes orphaned entries that reference non-existent:
 * - subEventId (SubEventTournaments or SubEventCompetitions)
 * - drawId (DrawTournaments or DrawCompetitions)
 *
 * Usage: node scripts/db/cleanup-orphaned-event-entries.js [environment]
 *
 * Environment defaults to 'development' if not specified
 */

const { Sequelize } = require("sequelize");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Get environment from command line argument or default to development
const environment = process.argv[2] || "development";
const retries = 5;
// Load database config
const config = {
  host: process.env.DB_IP,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  migrationStorageTableSchema: "public",
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === "true",
  },
  retry: {
    max: retries,
  },
};

if (!config) {
  console.error(`❌ Invalid environment: ${environment}`);
  console.error("Available environments: development, beta, prod");
  process.exit(1);
}

async function cleanupOrphanedEventEntries() {
  let sequelize;

  try {
    console.log(
      `🚀 Starting cleanup of orphaned EventEntry records in ${environment} environment...`
    );

    // Initialize Sequelize connection
    sequelize = new Sequelize(config);

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    await sequelize.transaction(async (transaction) => {
      console.log("\n📋 Step 1: Processing entries with subEventId...");

      // Delete tournament entries with invalid subEventId
      const orphanedTournamentSubEvents = await sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'tournament' 
         AND "subEventId" IS NOT NULL 
         AND "subEventId" NOT IN (SELECT id FROM event."SubEventTournaments")`,
        { transaction }
      );

      console.log(
        `🗑️  Deleted ${orphanedTournamentSubEvents[1].rowCount} orphaned tournament entries with invalid subEventId`
      );

      // Delete competition entries with invalid subEventId
      const orphanedCompetitionSubEvents = await sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'competition' 
         AND "subEventId" IS NOT NULL 
         AND "subEventId" NOT IN (SELECT id FROM event."SubEventCompetitions")`,
        { transaction }
      );

      console.log(
        `🗑️  Deleted ${orphanedCompetitionSubEvents[1].rowCount} orphaned competition entries with invalid subEventId`
      );

      const totalOrphanedSubEvents =
        orphanedTournamentSubEvents[1].rowCount + orphanedCompetitionSubEvents[1].rowCount;

      console.log("\n📋 Step 2: Processing entries with drawId...");

      // Delete tournament entries with invalid drawId
      const orphanedTournamentDraws = await sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'tournament' 
         AND "drawId" IS NOT NULL 
         AND "drawId" NOT IN (SELECT id FROM event."DrawTournaments")`,
        { transaction }
      );

      console.log(
        `🗑️  Deleted ${orphanedTournamentDraws[1].rowCount} orphaned tournament entries with invalid drawId`
      );

      // Delete competition entries with invalid drawId
      const orphanedCompetitionDraws = await sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'competition' 
         AND "drawId" IS NOT NULL 
         AND "drawId" NOT IN (SELECT id FROM event."DrawCompetitions")`,
        { transaction }
      );

      console.log(
        `🗑️  Deleted ${orphanedCompetitionDraws[1].rowCount} orphaned competition entries with invalid drawId`
      );

      const totalOrphanedDraws =
        orphanedTournamentDraws[1].rowCount + orphanedCompetitionDraws[1].rowCount;

      const totalCleaned = totalOrphanedSubEvents + totalOrphanedDraws;

      console.log("\n📊 Summary:");
      console.log(`   • SubEvent orphans: ${totalOrphanedSubEvents}`);
      console.log(`   • Draw orphans: ${totalOrphanedDraws}`);
      console.log(`   • Total cleaned: ${totalCleaned}`);

      if (totalCleaned === 0) {
        console.log("✨ No orphaned entries found - database is clean!");
      } else {
        console.log("🧹 Cleanup completed successfully");
      }

      console.log(
        "\n💡 Note: No foreign key constraints added due to polymorphic relationship design"
      );
      console.log("   Application-level cascade deletion is handled in sync processors");
    });
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the cleanup
cleanupOrphanedEventEntries()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  });
