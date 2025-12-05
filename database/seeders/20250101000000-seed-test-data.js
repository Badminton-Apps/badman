"use strict";

// const { Sequelize } = require("sequelize-typescript"); // Not used directly
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Note: This seeder uses raw Sequelize queries because Sequelize CLI seeders
// don't easily support TypeScript models with decorators.
// For a better solution, consider using a NestJS command (see apps/scripts)

/**
 * Find or create a player
 */
async function findOrCreatePlayer(
  sequelize,
  QueryTypes,
  transaction,
  userEmail,
  firstName,
  lastName,
  memberId,
  gender
) {
  try {
    // Check if user already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existingUsers = await sequelize.query(
      `SELECT id, email, "firstName", "lastName" FROM "Players" WHERE email = :email LIMIT 1`,
      {
        replacements: { email: userEmail },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (existingUsers && existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log(`✅ Found existing user: ${user.firstName} ${user.lastName} (${user.email})\n`);
      return user;
    }

    // Create new player
    console.log("👤 Creating new player...");
    const [playerResult] = await sequelize.query(
      `INSERT INTO "Players" (email, "firstName", "lastName", "memberId", gender, "createdAt", "updatedAt")
       VALUES (:email, :firstName, :lastName, :memberId, :gender, NOW(), NOW())
       RETURNING id, email, "firstName", "lastName"`,
      {
        replacements: {
          email: userEmail,
          firstName,
          lastName,
          memberId,
          gender,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const user = playerResult[0];
    console.log(`✅ Created new player: ${user.firstName} ${user.lastName} (${user.email})\n`);
    return user;
  } catch (err) {
    console.error("❌ Error finding/creating player:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create a club
 */
async function createClub(sequelize, QueryTypes, transaction, clubName) {
  try {
    console.log(`🏢 Creating Club: ${clubName}...`);
    // Generate abbreviation from club name (first 3 letters, uppercase)
    const abbreviation = clubName.substring(0, 3).toUpperCase();

    const [clubResult] = await sequelize.query(
      `INSERT INTO "Clubs" (name, "teamName", "fullName", abbreviation, "useForTeamName", "createdAt", "updatedAt")
       VALUES (:name, :teamName, :fullName, :abbreviation, :useForTeamName, NOW(), NOW())
       RETURNING id, name`,
      {
        replacements: {
          name: clubName,
          teamName: clubName,
          fullName: `${clubName} Full Name`,
          abbreviation,
          useForTeamName: "teamName",
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const clubId = clubResult[0].id;
    console.log(`✅ Created Club: ${clubName} (${clubId})\n`);
    return clubId;
  } catch (err) {
    console.error("❌ Error creating club:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Add player to club membership
 */
async function addPlayerToClub(sequelize, QueryTypes, transaction, clubId, playerId) {
  try {
    // Check if membership already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existing = await sequelize.query(
      `SELECT id FROM "ClubPlayerMemberships" 
       WHERE "clubId" = :clubId AND "playerId" = :playerId AND "end" IS NULL
       LIMIT 1`,
      {
        replacements: { clubId, playerId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (existing && existing.length > 0) {
      console.log(`ℹ️  Player already has an active membership with this club\n`);
      return;
    }

    // Note: QueryTypes.INSERT returns [results, metadata], so we need to destructure
    const [result] = await sequelize.query(
      `INSERT INTO "ClubPlayerMemberships" ("clubId", "playerId", "start", "confirmed", "membershipType", "createdAt", "updatedAt")
       VALUES (:clubId, :playerId, NOW(), true, 'NORMAL', NOW(), NOW())
       RETURNING id`,
      {
        replacements: { clubId, playerId },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    console.log("🔍 result:", result);

    // Verify the insert succeeded
    if (!result || !result[0] || !result[0].id) {
      throw new Error("Failed to insert ClubPlayerMembership - no ID returned");
    }

    console.log(`✅ Added user to club (membership ID: ${result[0].id})\n`);
  } catch (err) {
    console.error("❌ Error inserting ClubPlayerMembership:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create a team
 */
async function createTeam(sequelize, QueryTypes, transaction, clubId, season, captainId) {
  try {
    console.log("👥 Creating Team...");

    // Check if team already exists - wrap in try-catch to catch any errors
    let existing = null;
    console.log(
      `🔍 Checking for existing team: clubId=${clubId}, season=${season}, type=M, teamNumber=1`
    );

    // First verify transaction is still valid
    try {
      await sequelize.query("SELECT 1", { transaction });
      console.log("✅ Transaction valid before team check\n");
    } catch (verifyErr) {
      console.error("❌ Transaction was aborted before team check!");
      console.error("  Error:", verifyErr.message);
      throw verifyErr;
    }

    try {
      // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
      existing = await sequelize.query(
        `SELECT id FROM "Teams" 
         WHERE "clubId" = :clubId AND season = :season AND type = :type AND "teamNumber" = 1
         LIMIT 1`,
        {
          replacements: { clubId, season, type: "M" },
          type: QueryTypes.SELECT,
          transaction,
        }
      );
      console.log(`🔍 Existing team check result:`, existing);
      console.log(`🔍 Existing is array:`, Array.isArray(existing));
      console.log(`🔍 Existing length:`, existing?.length);

      // Verify transaction is still valid after check query
      await sequelize.query("SELECT 1", { transaction });
      console.log("✅ Transaction valid after team check\n");
    } catch (checkErr) {
      console.error("❌ Error checking for existing team:");
      console.error("  Message:", checkErr.message);
      console.error("  Code:", checkErr.parent?.code);
      console.error("  Detail:", checkErr.parent?.detail);
      console.error("  Constraint:", checkErr.parent?.constraint);
      console.error("  SQL:", checkErr.sql);
      console.error("  Full error:", JSON.stringify(checkErr, null, 2));
      throw checkErr; // Re-throw to abort transaction properly
    }

    if (existing && existing.length > 0) {
      console.log(`ℹ️  Team already exists for this club/season (ID: ${existing[0].id})\n`);
      return existing[0].id;
    }

    // Fetch club name to generate team name
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const clubData = await sequelize.query(
      `SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`,
      {
        replacements: { clubId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!clubData || clubData.length === 0) {
      throw new Error(`Club with id ${clubId} not found`);
    }

    const club = clubData[0];
    const teamNumber = 1;
    const type = "M";
    const letter = "H"; // getLetterForRegion("M", "vl") returns "H"

    // Generate team name from club name
    const teamName = `${club.name} ${teamNumber}${letter}`;
    const abbreviation = `${club.abbreviation} ${teamNumber}${letter}`;

    console.log(`🔍 Generated team name: ${teamName}`);
    console.log(`🔍 Generated abbreviation: ${abbreviation}`);

    const [teamResult] = await sequelize.query(
      `INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "captainId", "link", name, abbreviation, "createdAt", "updatedAt")
       VALUES (:clubId, :type, :season, 1, :captainId, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          clubId,
          type,
          season,
          captainId,
          name: teamName,
          abbreviation,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    console.log("🔍 teamResult:", teamResult);
    const teamId = teamResult[0].id;
    console.log(`✅ Created Team (${teamId})\n`);
    return teamId;
  } catch (err) {
    console.error("❌ Error creating team:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Add player to team membership
 */
async function addPlayerToTeam(sequelize, QueryTypes, transaction, teamId, playerId) {
  try {
    // Check if membership already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existingMemberships = await sequelize.query(
      `SELECT id FROM "TeamPlayerMemberships" 
       WHERE "teamId" = :teamId AND "playerId" = :playerId AND "end" IS NULL
       LIMIT 1`,
      {
        replacements: { teamId, playerId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (existingMemberships && existingMemberships.length > 0) {
      console.log(`ℹ️  Player already has an active membership with this team\n`);
      return;
    }

    // Note: TeamPlayerMemberships doesn't have an 'active' column
    // It only has: id, playerId, teamId, membershipType, start, end
    await sequelize.query(
      `INSERT INTO "TeamPlayerMemberships" ("teamId", "playerId", "start", "membershipType", "createdAt", "updatedAt")
       VALUES (:teamId, :playerId, NOW(), 'REGULAR', NOW(), NOW())`,
      {
        replacements: { teamId, playerId },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    console.log(`✅ Added user to team\n`);
  } catch (err) {
    console.error("❌ Error inserting TeamPlayerMembership:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create event competition
 */
async function createEventCompetition(sequelize, QueryTypes, transaction, season) {
  try {
    console.log("🏆 Creating EventCompetition...");
    const [eventResult] = await sequelize.query(
      `INSERT INTO event."EventCompetitions" (name, type, season, official, "visualCode", "createdAt", "updatedAt")
       VALUES (:name, :type, :season, true, :visualCode, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          name: `Test Event ${season}`,
          type: "PROV",
          season,
          visualCode: `TEST-${season}`,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const eventId = eventResult[0].id;
    console.log(`✅ Created EventCompetition (${eventId})\n`);
    return eventId;
  } catch (err) {
    console.error("❌ Error creating EventCompetition:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create sub event competition
 */
async function createSubEventCompetition(sequelize, QueryTypes, transaction, eventId) {
  try {
    console.log("📋 Creating SubEventCompetition...");
    const [subEventResult] = await sequelize.query(
      `INSERT INTO event."SubEventCompetitions" ("eventId", name, "eventType", level, "maxLevel", "minBaseIndex", "maxBaseIndex", "createdAt", "updatedAt")
       VALUES (:eventId, :name, :eventType, 1, 6, 50, 70, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          eventId,
          name: "Test SubEvent M",
          eventType: "M",
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const subEventId = subEventResult[0].id;
    console.log(`✅ Created SubEventCompetition (${subEventId})\n`);
    return subEventId;
  } catch (err) {
    console.error("❌ Error creating SubEventCompetition:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create draw competition
 */
async function createDrawCompetition(sequelize, QueryTypes, transaction, subEventId, season) {
  try {
    console.log("🎲 Creating DrawCompetition...");
    const [drawResult] = await sequelize.query(
      `INSERT INTO event."DrawCompetitions" ("subeventId", name, type, "visualCode", "createdAt", "updatedAt")
       VALUES (:subeventId, :name, :type, :visualCode, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          subeventId: subEventId,
          name: "Test Draw",
          type: "POULE",
          visualCode: `TEST-DRAW-${season}`,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const drawId = drawResult[0].id;
    console.log(`✅ Created DrawCompetition (${drawId})\n`);
    return drawId;
  } catch (err) {
    console.error("❌ Error creating DrawCompetition:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create opponent team
 */
async function createOpponentTeam(sequelize, QueryTypes, transaction, clubId, season) {
  try {
    console.log("👥 Creating opponent Team...");

    // Fetch club name to generate team name
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const clubData = await sequelize.query(
      `SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`,
      {
        replacements: { clubId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!clubData || clubData.length === 0) {
      throw new Error(`Club with id ${clubId} not found`);
    }

    const club = clubData[0];
    const teamNumber = 1; // Opponent team is team number 1 (first team of opponent club)
    const type = "M";
    const letter = "H"; // getLetterForRegion("M", "vl") returns "H"

    // Generate team name from club name
    const teamName = `${club.name} ${teamNumber}${letter}`;
    const abbreviation = `${club.abbreviation} ${teamNumber}${letter}`;

    console.log(`🔍 Generated opponent team name: ${teamName}`);
    console.log(`🔍 Generated opponent abbreviation: ${abbreviation}`);

    const [opponentTeamResult] = await sequelize.query(
      `INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "link", name, abbreviation, "createdAt", "updatedAt")
       VALUES (:clubId, :type, :season, 1, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          clubId,
          type,
          season,
          name: teamName,
          abbreviation,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    const opponentTeamId = opponentTeamResult[0].id;
    console.log(`✅ Created opponent Team (${opponentTeamId})\n`);
    return opponentTeamId;
  } catch (err) {
    console.error("❌ Error creating opponent team:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

/**
 * Create encounters
 */
async function createEncounters(
  sequelize,
  transaction,
  drawId,
  teamId,
  opponentTeamId,
  season,
  encounterCount = 10
) {
  try {
    console.log("⚔️ Creating Encounters...");
    for (let i = 0; i < encounterCount; i++) {
      // Generate valid dates: start from September (month 9) and increment
      // Use modulo to wrap months (9-12, then back to 1-12)
      const monthOffset = Math.floor(i / 2);
      const month = ((9 + monthOffset - 1) % 12) + 1; // Wrap around 1-12
      const day = 15 + (i % 15); // Days 15-29 (avoid edge cases)

      // Create date using Date constructor with year, month (0-indexed), day
      const encounterDate = new Date(season, month - 1, day);

      // Validate the date
      if (isNaN(encounterDate.getTime())) {
        throw new Error(`Invalid date created: ${season}-${month}-${day}`);
      }

      await sequelize.query(
        `INSERT INTO event."EncounterCompetitions" 
         ("drawId", "homeTeamId", "awayTeamId", date, "originalDate", "homeScore", "awayScore", 
          finished, accepted, "homeCaptainPresent", "awayCaptainPresent", "gameLeaderPresent",
          "homeCaptainAccepted", "awayCaptainAccepted", "gameLeaderAccepted", "createdAt", "updatedAt")
         VALUES (:drawId, :homeTeamId, :awayTeamId, :date, :originalDate, :homeScore, :awayScore,
                 :finished, :accepted, :homeCaptainPresent, :awayCaptainPresent, false,
                 :homeCaptainAccepted, :awayCaptainAccepted, false, NOW(), NOW())`,
        {
          replacements: {
            drawId,
            homeTeamId: i % 2 === 0 ? teamId : opponentTeamId,
            awayTeamId: i % 2 === 0 ? opponentTeamId : teamId,
            date: encounterDate,
            originalDate: encounterDate,
            homeScore: i % 3 === 0 ? 4 : 0,
            awayScore: i % 3 === 0 ? 2 : 0,
            finished: i % 3 === 0,
            accepted: i % 2 === 0,
            homeCaptainPresent: i % 2 === 0,
            awayCaptainPresent: i % 2 === 0,
            homeCaptainAccepted: i % 2 === 0,
            awayCaptainAccepted: i % 2 === 0,
          },
          transaction,
        }
      );
    }
    console.log(`✅ Created ${encounterCount} Encounters\n`);
  } catch (err) {
    console.error("❌ Error creating encounters:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.parent?.code);
    console.error("  Detail:", err.parent?.detail);
    console.error("  Constraint:", err.parent?.constraint);
    console.error("  SQL:", err.sql);
    console.error("  Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

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
        // Get current season (September to April)
        const now = new Date();
        const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        console.log(`📅 Using season: ${season}\n`);

        // Find or create player
        const user = await findOrCreatePlayer(
          sequelize,
          QueryTypes,
          transaction,
          userEmail,
          firstName,
          lastName,
          memberId,
          gender
        );

        // Create first club (user's club)
        const clubId = await createClub(sequelize, QueryTypes, transaction, "TEAM AWESOME");

        // Add player to club
        await addPlayerToClub(sequelize, QueryTypes, transaction, clubId, user.id);

        // Verify transaction is still valid by running a simple query
        try {
          await sequelize.query("SELECT 1", { transaction });
          console.log("✅ Transaction is still valid after adding player to club\n");
        } catch (verifyErr) {
          console.error("❌ Transaction was aborted after adding player to club!");
          console.error("  Error:", verifyErr.message);
          throw verifyErr;
        }

        // Create team
        const teamId = await createTeam(
          sequelize,
          QueryTypes,
          transaction,
          clubId,
          season,
          user.id
        );

        // Add player to team
        await addPlayerToTeam(sequelize, QueryTypes, transaction, teamId, user.id);

        // Create event competition
        const eventId = await createEventCompetition(sequelize, QueryTypes, transaction, season);

        // Create sub event competition
        const subEventId = await createSubEventCompetition(
          sequelize,
          QueryTypes,
          transaction,
          eventId
        );

        // Create draw competition
        const drawId = await createDrawCompetition(
          sequelize,
          QueryTypes,
          transaction,
          subEventId,
          season
        );

        // Create second club (opponent club)
        const opponentClubId = await createClub(
          sequelize,
          QueryTypes,
          transaction,
          "THE OPPONENTS"
        );

        // Create opponent team (in the second club)
        const opponentTeamId = await createOpponentTeam(
          sequelize,
          QueryTypes,
          transaction,
          opponentClubId,
          season
        );

        // Create encounters
        await createEncounters(sequelize, transaction, drawId, teamId, opponentTeamId, season);

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
