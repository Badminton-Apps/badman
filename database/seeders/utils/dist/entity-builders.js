"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEncounters = exports.createOpponentTeam = exports.createDrawCompetition = exports.createSubEventCompetition = exports.createEventCompetition = exports.addPlayerToTeam = exports.createTeam = exports.addPlayerToClub = exports.createClub = exports.findOrCreatePlayer = void 0;
const error_handler_1 = require("./error-handler");
/**
 * Find or create a player
 */
async function findOrCreatePlayer(ctx, userEmail, firstName, lastName, memberId, gender) {
    // Check if user already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existingUsers = await ctx.query(`SELECT id, email, "firstName", "lastName" FROM "Players" WHERE email = :email LIMIT 1`, { email: userEmail });
    if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0];
        console.log(`✅ Found existing user: ${user.firstName} ${user.lastName} (${user.email})\n`);
        return user;
    }
    // Create new player
    console.log("👤 Creating new player...");
    const user = await ctx.insert(`INSERT INTO "Players" (email, "firstName", "lastName", "memberId", gender, "createdAt", "updatedAt")
     VALUES (:email, :firstName, :lastName, :memberId, :gender, NOW(), NOW())
     RETURNING id, email, "firstName", "lastName"`, {
        email: userEmail,
        firstName,
        lastName,
        memberId,
        gender,
    });
    console.log(`✅ Created new player: ${user.firstName} ${user.lastName} (${user.email})\n`);
    return user;
}
/**
 * Create a club
 */
async function createClub(ctx, clubName) {
    console.log(`🏢 Creating Club: ${clubName}...`);
    // Generate abbreviation from club name (first 3 letters, uppercase)
    const abbreviation = clubName.substring(0, 3).toUpperCase();
    const club = await ctx.insert(`INSERT INTO "Clubs" (name, "teamName", "fullName", abbreviation, "useForTeamName", "createdAt", "updatedAt")
     VALUES (:name, :teamName, :fullName, :abbreviation, :useForTeamName, NOW(), NOW())
     RETURNING id, name`, {
        name: clubName,
        teamName: clubName,
        fullName: `${clubName} Full Name`,
        abbreviation,
        useForTeamName: "teamName",
    });
    const clubId = club.id;
    console.log(`✅ Created Club: ${clubName} (${clubId})\n`);
    return clubId;
}
/**
 * Add player to club membership
 */
async function addPlayerToClub(ctx, clubId, playerId) {
    // Check if membership already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existing = await ctx.query(`SELECT id FROM "ClubPlayerMemberships" 
     WHERE "clubId" = :clubId AND "playerId" = :playerId AND "end" IS NULL
     LIMIT 1`, { clubId, playerId });
    if (existing && existing.length > 0) {
        console.log(`ℹ️  Player already has an active membership with this club\n`);
        return;
    }
    // Note: QueryTypes.INSERT returns [results, metadata], so we need to destructure
    const queryResult = await ctx.sequelize.query(`INSERT INTO "ClubPlayerMemberships" ("clubId", "playerId", "start", "confirmed", "membershipType", "createdAt", "updatedAt")
     VALUES (:clubId, :playerId, NOW(), true, 'NORMAL', NOW(), NOW())
     RETURNING id`, {
        replacements: { clubId, playerId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: ctx.QueryTypes.INSERT,
        transaction: ctx.transaction,
    });
    const result = queryResult[0];
    console.log("🔍 result:", result);
    // Verify the insert succeeded
    if (!result || !result[0] || !result[0].id) {
        throw new Error("Failed to insert ClubPlayerMembership - no ID returned");
    }
    console.log(`✅ Added user to club (membership ID: ${result[0].id})\n`);
}
/**
 * Create a team
 */
async function createTeam(ctx, clubId, season, captainId) {
    console.log("👥 Creating Team...");
    // Check if team already exists - wrap in try-catch to catch any errors
    let existing = null;
    console.log(`🔍 Checking for existing team: clubId=${clubId}, season=${season}, type=M, teamNumber=1`);
    // First verify transaction is still valid
    await ctx.verifyTransaction();
    console.log("✅ Transaction valid before team check\n");
    try {
        // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
        existing = await ctx.query(`SELECT id FROM "Teams" 
       WHERE "clubId" = :clubId AND season = :season AND type = :type AND "teamNumber" = 1
       LIMIT 1`, { clubId, season, type: "M" });
        console.log(`🔍 Existing team check result:`, existing);
        console.log(`🔍 Existing is array:`, Array.isArray(existing));
        console.log(`🔍 Existing length:`, existing?.length);
        // Verify transaction is still valid after check query
        await ctx.verifyTransaction();
        console.log("✅ Transaction valid after team check\n");
    }
    catch (checkErr) {
        const err = checkErr;
        console.error("❌ Error checking for existing team:");
        console.error("  Message:", err.message);
        console.error("  Code:", err.parent?.code);
        console.error("  Detail:", err.parent?.detail);
        console.error("  Constraint:", err.parent?.constraint);
        console.error("  SQL:", err.sql);
        console.error("  Full error:", JSON.stringify(err, null, 2));
        throw err; // Re-throw to abort transaction properly
    }
    if (existing && existing.length > 0 && existing[0]) {
        console.log(`ℹ️  Team already exists for this club/season (ID: ${existing[0].id})\n`);
        return existing[0].id;
    }
    // Fetch club name to generate team name
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const clubData = await ctx.query(`SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`, { clubId });
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
    const team = await ctx.insert(`INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "captainId", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, :captainId, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`, {
        clubId,
        type,
        season,
        captainId,
        name: teamName,
        abbreviation,
    });
    console.log("🔍 teamResult:", team);
    const teamId = team.id;
    console.log(`✅ Created Team (${teamId})\n`);
    return teamId;
}
/**
 * Add player to team membership
 */
async function addPlayerToTeam(ctx, teamId, playerId) {
    // Check if membership already exists
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const existingMemberships = await ctx.query(`SELECT id FROM "TeamPlayerMemberships" 
     WHERE "teamId" = :teamId AND "playerId" = :playerId AND "end" IS NULL
     LIMIT 1`, { teamId, playerId });
    if (existingMemberships && existingMemberships.length > 0) {
        console.log(`ℹ️  Player already has an active membership with this team\n`);
        return;
    }
    // Note: TeamPlayerMemberships doesn't have an 'active' column
    // It only has: id, playerId, teamId, membershipType, start, end
    await ctx.rawQuery(`INSERT INTO "TeamPlayerMemberships" ("teamId", "playerId", "start", "membershipType", "createdAt", "updatedAt")
     VALUES (:teamId, :playerId, NOW(), 'REGULAR', NOW(), NOW())`, { teamId, playerId });
    console.log(`✅ Added user to team\n`);
}
/**
 * Create event competition
 */
async function createEventCompetition(ctx, season) {
    console.log("🏆 Creating EventCompetition...");
    const event = await ctx.insert(`INSERT INTO event."EventCompetitions" (name, type, season, official, "visualCode", "createdAt", "updatedAt")
     VALUES (:name, :type, :season, true, :visualCode, NOW(), NOW())
     RETURNING id`, {
        name: `Test Event ${season}`,
        type: "PROV",
        season,
        visualCode: `TEST-${season}`,
    });
    const eventId = event.id;
    console.log(`✅ Created EventCompetition (${eventId})\n`);
    return eventId;
}
/**
 * Create sub event competition
 */
async function createSubEventCompetition(ctx, eventId) {
    console.log("📋 Creating SubEventCompetition...");
    const subEvent = await ctx.insert(`INSERT INTO event."SubEventCompetitions" ("eventId", name, "eventType", level, "maxLevel", "minBaseIndex", "maxBaseIndex", "createdAt", "updatedAt")
     VALUES (:eventId, :name, :eventType, 1, 6, 50, 70, NOW(), NOW())
     RETURNING id`, {
        eventId,
        name: "Test SubEvent M",
        eventType: "M",
    });
    const subEventId = subEvent.id;
    console.log(`✅ Created SubEventCompetition (${subEventId})\n`);
    return subEventId;
}
/**
 * Create draw competition
 */
async function createDrawCompetition(ctx, subEventId, season) {
    console.log("🎲 Creating DrawCompetition...");
    const draw = await ctx.insert(`INSERT INTO event."DrawCompetitions" ("subeventId", name, type, "visualCode", "createdAt", "updatedAt")
     VALUES (:subeventId, :name, :type, :visualCode, NOW(), NOW())
     RETURNING id`, {
        subeventId: subEventId,
        name: "Test Draw",
        type: "POULE",
        visualCode: `TEST-DRAW-${season}`,
    });
    const drawId = draw.id;
    console.log(`✅ Created DrawCompetition (${drawId})\n`);
    return drawId;
}
/**
 * Create opponent team
 */
async function createOpponentTeam(ctx, clubId, season) {
    console.log("👥 Creating opponent Team...");
    // Fetch club name to generate team name
    // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
    const clubData = await ctx.query(`SELECT name, abbreviation FROM "Clubs" WHERE id = :clubId LIMIT 1`, { clubId });
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
    const opponentTeam = await ctx.insert(`INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`, {
        clubId,
        type,
        season,
        name: teamName,
        abbreviation,
    });
    const opponentTeamId = opponentTeam.id;
    console.log(`✅ Created opponent Team (${opponentTeamId})\n`);
    return opponentTeamId;
}
/**
 * Create encounters
 */
async function createEncounters(ctx, drawId, teamId, opponentTeamId, season, encounterCount = 10) {
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
        await ctx.rawQuery(`INSERT INTO event."EncounterCompetitions" 
       ("drawId", "homeTeamId", "awayTeamId", date, "originalDate", "homeScore", "awayScore", 
        finished, accepted, "homeCaptainPresent", "awayCaptainPresent", "gameLeaderPresent",
        "homeCaptainAccepted", "awayCaptainAccepted", "gameLeaderAccepted", "createdAt", "updatedAt")
       VALUES (:drawId, :homeTeamId, :awayTeamId, :date, :originalDate, :homeScore, :awayScore,
               :finished, :accepted, :homeCaptainPresent, :awayCaptainPresent, false,
               :homeCaptainAccepted, :awayCaptainAccepted, false, NOW(), NOW())`, {
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
        });
    }
    console.log(`✅ Created ${encounterCount} Encounters\n`);
}
// Wrap all functions with error handling
const findOrCreatePlayerWithErrorHandling = (0, error_handler_1.withErrorHandling)(findOrCreatePlayer, "finding/creating player");
exports.findOrCreatePlayer = findOrCreatePlayerWithErrorHandling;
const createClubWithErrorHandling = (0, error_handler_1.withErrorHandling)(createClub, "creating club");
exports.createClub = createClubWithErrorHandling;
const addPlayerToClubWithErrorHandling = (0, error_handler_1.withErrorHandling)(addPlayerToClub, "inserting ClubPlayerMembership");
exports.addPlayerToClub = addPlayerToClubWithErrorHandling;
const createTeamWithErrorHandling = (0, error_handler_1.withErrorHandling)(createTeam, "creating team");
exports.createTeam = createTeamWithErrorHandling;
const addPlayerToTeamWithErrorHandling = (0, error_handler_1.withErrorHandling)(addPlayerToTeam, "inserting TeamPlayerMembership");
exports.addPlayerToTeam = addPlayerToTeamWithErrorHandling;
const createEventCompetitionWithErrorHandling = (0, error_handler_1.withErrorHandling)(createEventCompetition, "creating EventCompetition");
exports.createEventCompetition = createEventCompetitionWithErrorHandling;
const createSubEventCompetitionWithErrorHandling = (0, error_handler_1.withErrorHandling)(createSubEventCompetition, "creating SubEventCompetition");
exports.createSubEventCompetition = createSubEventCompetitionWithErrorHandling;
const createDrawCompetitionWithErrorHandling = (0, error_handler_1.withErrorHandling)(createDrawCompetition, "creating DrawCompetition");
exports.createDrawCompetition = createDrawCompetitionWithErrorHandling;
const createOpponentTeamWithErrorHandling = (0, error_handler_1.withErrorHandling)(createOpponentTeam, "creating opponent team");
exports.createOpponentTeam = createOpponentTeamWithErrorHandling;
const createEncountersWithErrorHandling = (0, error_handler_1.withErrorHandling)(createEncounters, "creating encounters");
exports.createEncounters = createEncountersWithErrorHandling;
