"use strict";

const path = require("path");
const env = process.env.NODE_ENV || "development";
require("dotenv").config({ path: path.resolve(__dirname, `../../.env.${env}`) });
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
const ENCOUNTER_COUNT = 10;
const HISTORICAL_TEAM_TYPES = ["M", "F", "MX"];

/**
 * Load seed config from environment (same keys for up and down).
 *
 * Supported env vars (all optional):
 *   SEED_HOMETEAM_USER_EMAIL, SEED_HOMETEAM_FIRST_NAME, SEED_HOMETEAM_LAST_NAME,
 *   SEED_HOMETEAM_MEMBER_ID, SEED_HOMETEAM_GENDER, SEED_HOMETEAM_USER_AUTH0_SUB
 *   SEED_AWAYTEAM_USER_EMAIL, SEED_AWAYTEAM_FIRST_NAME, SEED_AWAYTEAM_LAST_NAME,
 *   SEED_AWAYTEAM_MEMBER_ID, SEED_AWAYTEAM_GENDER, SEED_AWAYTEAM_USER_AUTH0_SUB
 */
function loadSeedConfig() {
  return {
    homeTeam: {
      email: process.env.SEED_HOMETEAM_USER_EMAIL || "test@example.com",
      firstName: process.env.SEED_HOMETEAM_FIRST_NAME || "Test",
      lastName: process.env.SEED_HOMETEAM_LAST_NAME || "User",
      memberId: process.env.SEED_HOMETEAM_MEMBER_ID || `TEST-${Date.now()}`,
      gender: process.env.SEED_HOMETEAM_GENDER || "M",
      sub: process.env.SEED_HOMETEAM_USER_AUTH0_SUB || "",
    },
    awayTeam: {
      email: process.env.SEED_AWAYTEAM_USER_EMAIL || "opponent@example.com",
      firstName: process.env.SEED_AWAYTEAM_FIRST_NAME || "Opponent",
      lastName: process.env.SEED_AWAYTEAM_LAST_NAME || "User",
      memberId: process.env.SEED_AWAYTEAM_MEMBER_ID || `TEST-OPPONENT-${Date.now()}`,
      gender: process.env.SEED_AWAYTEAM_GENDER || "M",
      sub: process.env.SEED_AWAYTEAM_USER_AUTH0_SUB || "",
    },
  };
}

/**
 * Grant club permission claims (edit-any:club, edit:club) to a player.
 */
async function grantClubClaims(sequelize, transaction, QueryTypes, playerId, userEmail) {
  const claims = await sequelize.query(
    `SELECT id, name FROM "security"."Claims" WHERE name IN ('edit-any:club', 'edit:club')`,
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
      console.log(`✅ Granted claim "${claim.name}" to user (${userEmail})\n`);
    }
  }
  if (claims.length > 0) {
    console.log(`✅ Added ${claims.length} club permission claim(s) for user\n`);
  }
}

/**
 * Find or create a user player and add ranking. Does not grant claims.
 */
async function seedUserAndClaims(ctx, userConfig) {
  const user = await findOrCreatePlayer(
    ctx,
    userConfig.email,
    userConfig.firstName,
    userConfig.lastName,
    userConfig.memberId,
    userConfig.gender,
    true,
    userConfig.sub
  );
  await addRankingToPlayer(ctx, user.id);
  return user;
}

/**
 * Seed one club with players and teams (main + historical). Returns clubId, teamId, players, historicalTeamIds.
 */
async function seedClubWithPlayersAndTeams(ctx, clubName, captainUser, season, previousSeason, options) {
  const {
    playerCount = PLAYERS_ON_TEAM,
    factoryOptions = {},
    useCreateOpponentTeam = false,
  } = options;

  const clubId = await createClub(ctx, clubName);
  const createTeamFn = useCreateOpponentTeam ? createOpponentTeam : createTeam;

  const additionalPlayers = await PlayerFactory.createForTeam(ctx, clubName, playerCount, factoryOptions);
  const players = [captainUser, ...additionalPlayers];

  for (const player of additionalPlayers) {
    await addPlayerToClub(ctx, clubId, player.id);
  }
  await addPlayerToClub(ctx, clubId, captainUser.id);

  await ctx.verifyTransaction();
  console.log("✅ Transaction is still valid after adding players to club\n");

  // Set membership start to the beginning of the season (Aug 1) so it covers all seeded encounters,
  // including past ones whose date is earlier than today.
  const seasonStart = new Date(`${season}-08-01`);
  const previousSeasonStart = new Date(`${previousSeason}-08-01`);

  const teamId = await createTeamFn(ctx, clubId, season, captainUser.id, "MX");
  for (const player of players) {
    await addPlayerToTeam(ctx, teamId, player.id, seasonStart);
  }
  console.log(`✅ Added ${players.length} players to ${clubName}\n`);

  const historicalTeamIds = [];
  for (const teamType of HISTORICAL_TEAM_TYPES) {
    const historicalTeamId = await createTeamFn(ctx, clubId, previousSeason, captainUser.id, teamType);
    historicalTeamIds.push(historicalTeamId);
    for (const player of players) {
      await addPlayerToTeam(ctx, historicalTeamId, player.id, previousSeasonStart);
    }
  }
  console.log(`✅ Created 3 historical teams for ${clubName} (season ${previousSeason}): M, F, MX\n`);

  return { clubId, teamId, players, historicalTeamIds };
}

/**
 * Create event tree (event, subevent, draw) for test data. Returns ids for encounters.
 */
async function seedEventTree(ctx, season) {
  const eventId = await createEventCompetition(ctx, season);
  const subEventId = await createSubEventCompetition(ctx, eventId);
  const drawId = await createDrawCompetition(ctx, subEventId, season);
  return { eventId, subEventId, drawId };
}

/**
 * Build IN-clause placeholders and replacements for parameterized queries.
 */
function buildInClause(ids, paramName) {
  const placeholders = ids.map((_, i) => `:${paramName}${i}`).join(", ");
  const replacements = ids.reduce((acc, id, i) => {
    acc[`${paramName}${i}`] = id;
    return acc;
  }, {});
  return { placeholders, replacements };
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = Sequelize;
    const config = loadSeedConfig();

    console.log(`🚀 Starting seed for user: ${config.homeTeam.email}\n`);

    try {
      return await sequelize.transaction(async (transaction) => {
        const ctx = new SeederContext(sequelize, QueryTypes, transaction);

        const now = new Date();
        const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        const previousSeason = season - 1;
        console.log(`📅 Using season: ${season}\n`);
        console.log(`📅 Using previous season for historical teams: ${previousSeason}\n`);

        const user = await seedUserAndClaims(ctx, config.homeTeam);
        await grantClubClaims(sequelize, transaction, QueryTypes, user.id, config.homeTeam.email);

        const home = await seedClubWithPlayersAndTeams(ctx, "TEAM AWESOME", user, season, previousSeason, {
          playerCount: PLAYERS_ON_TEAM,
          factoryOptions: {
            gender: "mixed",
            domain: "teamawesome.com",
            prefix: "TEST-AWESOME",
            baseIndex: 0,
          },
          useCreateOpponentTeam: false,
        });

        const { eventId, subEventId, drawId } = await seedEventTree(ctx, season);

        const opponentUser = await seedUserAndClaims(ctx, config.awayTeam);
        const opponent = await seedClubWithPlayersAndTeams(ctx, "THE OPPONENTS", opponentUser, season, previousSeason, {
          playerCount: PLAYERS_ON_TEAM,
          factoryOptions: {
            gender: "mixed",
            domain: "opponents.com",
            prefix: "TEST-OPPONENTS",
            baseIndex: 8,
          },
          useCreateOpponentTeam: true,
        });

        await createEncounters(ctx, drawId, home.teamId, opponent.teamId, ENCOUNTER_COUNT);

        console.log("📊 Summary:");
        console.log(`   • Club: TEAM AWESOME (${home.clubId})`);
        console.log(`   • Team: ${home.teamId} with ${home.players.length} players`);
        console.log(`   • User: ${config.homeTeam.email}`);
        console.log(`   • Opponent Club: THE OPPONENTS (${opponent.clubId})`);
        console.log(`   • Opponent Team: ${opponent.teamId} with ${opponent.players.length} players`);
        console.log(`   • Opponent User: ${config.awayTeam.email}`);
        console.log(`   • Event: Test Event ${season} (${eventId})`);
        console.log(`   • SubEvent: Test SubEvent M (${subEventId})`);
        console.log(`   • Draw: Test Draw (${drawId})`);
        console.log(`   • Encounters: ${ENCOUNTER_COUNT}`);
        console.log(
          `   • Historical teams (season ${previousSeason}): TEAM AWESOME [${home.historicalTeamIds.join(", ")}], THE OPPONENTS [${opponent.historicalTeamIds.join(", ")}]`
        );
        console.log("\n✨ Seed completed successfully!");
      });
    } catch (error) {
      console.error("❌ Error during seeding:", error.message);
      console.error(error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const config = loadSeedConfig();
    const userEmail = config.homeTeam.email;
    const opponentUserEmail = config.awayTeam.email;

    console.log(`🧹 Cleaning up seed data for users: ${userEmail}, ${opponentUserEmail}\n`);
    console.log("📍 Step 1: Starting cleanup process...\n");

    const safeDelete = async (sql, replacements, description) => {
      console.log(`🔍 Attempting: ${description}...`);
      try {
        const result = await sequelize.query(sql, { replacements });
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
        if (
          err.message?.includes("does not exist") ||
          err.message?.includes("violates foreign key constraint") ||
          err.code === "42P01" ||
          err.code === "23503"
        ) {
          console.log(`ℹ️  ${description} - skipped (data may not exist or has dependencies)`);
          return null;
        }
        console.warn(`⚠️  ${description} - continuing despite error`);
        return null;
      }
    };

    const CLEANUP_TASKS = [
      {
        description: "Deleted encounters",
        sql: `DELETE FROM event."EncounterCompetitions" 
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
        replacements: {},
      },
      {
        description: "Deleted draws",
        sql: `DELETE FROM event."DrawCompetitions" 
           WHERE "subeventId" IN (
             SELECT id FROM event."SubEventCompetitions" 
             WHERE "eventId" IN (
               SELECT id FROM event."EventCompetitions" 
               WHERE "visualCode" LIKE 'TEST-%'
             )
           )`,
        replacements: {},
      },
      {
        description: "Deleted sub events",
        sql: `DELETE FROM event."SubEventCompetitions" 
           WHERE "eventId" IN (
             SELECT id FROM event."EventCompetitions" 
             WHERE "visualCode" LIKE 'TEST-%'
           )`,
        replacements: {},
      },
      {
        description: "Deleted events",
        sql: `DELETE FROM event."EventCompetitions" WHERE "visualCode" LIKE 'TEST-%'`,
        replacements: {},
      },
    ];

    try {
      console.log("📍 Step 2: Finding test clubs...\n");
      const clubs = await sequelize.query(
        `SELECT DISTINCT c.id, c."createdAt" FROM "Clubs" c
         WHERE c.name IN ('TEAM AWESOME', 'THE OPPONENTS')
         ORDER BY c."createdAt" ASC`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`📍 Found ${clubs?.length || 0} test clubs\n`);

      if (clubs && clubs.length > 0) {
        const clubIds = clubs.map((c) => c.id);
        console.log(`📍 Step 3: Starting deletion process for ${clubIds.length} clubs...\n`);

        const { placeholders: clubPlaceholders, replacements: clubReplacements } = buildInClause(clubIds, "clubId");

        // Discover players via club membership before memberships are deleted
        console.log("📍 Step 3.5: Finding test players via club membership...\n");
        const testPlayers = await sequelize.query(
          `SELECT DISTINCT p.id
           FROM "Players" p
           JOIN "ClubPlayerMemberships" cpm ON cpm."playerId" = p.id
           WHERE cpm."clubId" IN (${clubPlaceholders})
           UNION
           SELECT id FROM "Players" WHERE email IN (:userEmail, :opponentUserEmail)`,
          {
            replacements: { ...clubReplacements, userEmail, opponentUserEmail },
            type: Sequelize.QueryTypes.SELECT,
          }
        );
        console.log(`📍 Found ${testPlayers?.length || 0} test players\n`);

        for (const task of CLEANUP_TASKS) {
          console.log(`📍 ${task.description}...\n`);
          await safeDelete(task.sql, task.replacements, task.description);
        }

        console.log("📍 Deleting team memberships...\n");
        await safeDelete(
          `DELETE FROM "TeamPlayerMemberships" 
           WHERE "teamId" IN (
             SELECT id FROM "Teams" WHERE "clubId" IN (${clubPlaceholders})
           )`,
          clubReplacements,
          "Deleted team memberships"
        );

        console.log("📍 Deleting teams...\n");
        await safeDelete(
          `DELETE FROM "Teams" WHERE "clubId" IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted teams"
        );

        console.log("📍 Deleting club memberships...\n");
        await safeDelete(
          `DELETE FROM "ClubPlayerMemberships" WHERE "clubId" IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted club memberships"
        );

        console.log("📍 Deleting clubs...\n");
        await safeDelete(
          `DELETE FROM "Clubs" WHERE id IN (${clubPlaceholders})`,
          clubReplacements,
          "Deleted clubs"
        );

        if (testPlayers && testPlayers.length > 0) {
          const playerIds = testPlayers.map((p) => p.id);
          const { placeholders: playerPlaceholders, replacements: playerReplacements } = buildInClause(
            playerIds,
            "playerId"
          );

          const playerCleanupTasks = [
            {
              description: "Deleted permission claims for seeded players",
              sql: `DELETE FROM "security"."PlayerClaimMemberships" WHERE "playerId" IN (${playerPlaceholders})`,
              replacements: playerReplacements,
            },
            {
              description: "Deleted ranking points",
              sql: `DELETE FROM ranking."RankingPoints" WHERE "playerId" IN (${playerPlaceholders})`,
              replacements: playerReplacements,
            },
            {
              description: "Deleted ranking places",
              sql: `DELETE FROM ranking."RankingPlaces" WHERE "playerId" IN (${playerPlaceholders})`,
              replacements: playerReplacements,
            },
            {
              description: "Deleted ranking last places",
              sql: `DELETE FROM ranking."RankingLastPlaces" WHERE "playerId" IN (${playerPlaceholders})`,
              replacements: playerReplacements,
            },
            {
              description: "Deleted test players",
              sql: `DELETE FROM "Players" WHERE id IN (${playerPlaceholders})`,
              replacements: playerReplacements,
            },
          ];

          for (const task of playerCleanupTasks) {
            console.log(`📍 ${task.description}...\n`);
            await safeDelete(task.sql, task.replacements, task.description);
          }
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
      console.log("\n⚠️  Some cleanup operations may have failed, but continuing...");
    }
  },
};
