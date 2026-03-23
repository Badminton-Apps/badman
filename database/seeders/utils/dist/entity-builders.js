"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAvailability = exports.createLocation = exports.createEncounters = exports.createOpponentTeam = exports.createDrawCompetition = exports.createSubEventCompetition = exports.createEventCompetition = exports.addPlayerToTeam = exports.createTeam = exports.addPlayerToClub = exports.createClub = exports.findOrCreatePlayer = void 0;
const error_handler_1 = require("./error-handler");
const club_team_naming_1 = require("./club-team-naming");
const membership_helpers_1 = require("./membership-helpers");
/**
 * Find or create a player
 */
async function findOrCreatePlayer(ctx, userEmail, firstName, lastName, memberId, gender, competitionPlayer, sub) {
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
    const user = await ctx.insert(`INSERT INTO "Players" (email, "firstName", "lastName", "memberId", gender, "createdAt", "updatedAt", "competitionPlayer", "sub")
     VALUES (:email, :firstName, :lastName, :memberId, :gender, NOW(), NOW(),:competitionPlayer, :sub)
     RETURNING id, email, "firstName", "lastName"`, {
        email: userEmail,
        firstName,
        lastName,
        memberId,
        gender,
        competitionPlayer,
        sub,
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
    const existing = await (0, membership_helpers_1.hasActiveMembership)(ctx, "ClubPlayerMemberships", `"clubId" = :clubId AND "playerId" = :playerId`, { clubId, playerId });
    if (existing) {
        console.log(`ℹ️  Player already has an active membership with this club\n`);
        return;
    }
    const row = await ctx.insert(`INSERT INTO "ClubPlayerMemberships" ("clubId", "playerId", "start", "confirmed", "membershipType", "createdAt", "updatedAt")
     VALUES (:clubId, :playerId, NOW(), true, 'NORMAL', NOW(), NOW())
     RETURNING id`, { clubId, playerId });
    console.log(`✅ Added user to club (membership ID: ${row.id})\n`);
}
/**
 * Internal: insert a team row (used by createTeam and createOpponentTeam).
 */
async function insertTeam(ctx, clubId, season, captainId, teamType) {
    const club = await (0, club_team_naming_1.getClubById)(ctx, clubId);
    const { name: teamName, abbreviation } = (0, club_team_naming_1.generateTeamName)(club, 1, teamType, "H");
    const team = await ctx.insert(`INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "captainId", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, :captainId, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`, {
        clubId,
        type: teamType,
        season,
        captainId,
        name: teamName,
        abbreviation,
    });
    return team.id;
}
/**
 * Create a team (idempotent: returns existing team if same club/season/type).
 */
async function createTeam(ctx, clubId, season, captainId, teamType = "M") {
    console.log("👥 Creating Team...");
    const existing = await ctx.query(`SELECT id FROM "Teams" 
     WHERE "clubId" = :clubId AND season = :season AND type = :type AND "teamNumber" = 1
     LIMIT 1`, { clubId, season, type: teamType });
    if (existing && existing.length > 0 && existing[0]) {
        console.log(`ℹ️  Team already exists for this club/season (ID: ${existing[0].id})\n`);
        return existing[0].id;
    }
    const teamId = await insertTeam(ctx, clubId, season, captainId, teamType);
    console.log(`✅ Created Team (${teamId})\n`);
    return teamId;
}
/**
 * Add player to team membership
 */
async function addPlayerToTeam(ctx, teamId, playerId, membershipStart) {
    // Check if membership already exists
    const existing = await (0, membership_helpers_1.hasActiveMembership)(ctx, "TeamPlayerMemberships", `"teamId" = :teamId AND "playerId" = :playerId`, { teamId, playerId });
    if (existing) {
        console.log(`ℹ️  Player already has an active membership with this team\n`);
        return;
    }
    const start = membershipStart ?? new Date();
    await ctx.rawQuery(`INSERT INTO "TeamPlayerMemberships" ("teamId", "playerId", "start", "membershipType", "createdAt", "updatedAt")
     VALUES (:teamId, :playerId, :start, 'REGULAR', NOW(), NOW())`, { teamId, playerId, start });
    console.log(`✅ Added user to team\n`);
}
/**
 * Create event competition (idempotent: returns existing if visualCode already exists).
 */
async function createEventCompetition(ctx, season) {
    console.log("🏆 Creating EventCompetition...");
    const visualCode = `TEST-${season}`;
    const existing = await ctx.query(`SELECT id FROM event."EventCompetitions" WHERE "visualCode" = :visualCode LIMIT 1`, { visualCode });
    if (existing && existing.length > 0 && existing[0]) {
        console.log(`ℹ️  EventCompetition already exists (${existing[0].id})\n`);
        return existing[0].id;
    }
    const event = await ctx.insert(`INSERT INTO event."EventCompetitions" (name, type, season, official, "visualCode", "createdAt", "updatedAt")
     VALUES (:name, :type, :season, true, :visualCode, NOW(), NOW())
     RETURNING id`, {
        name: `Test Event ${season}`,
        type: "PROV",
        season,
        visualCode,
    });
    const eventId = event.id;
    console.log(`✅ Created EventCompetition (${eventId})\n`);
    return eventId;
}
/**
 * Create sub event competition (idempotent: returns existing if same eventId + name exists).
 */
async function createSubEventCompetition(ctx, eventId) {
    console.log("📋 Creating SubEventCompetition...");
    const existing = await ctx.query(`SELECT id FROM event."SubEventCompetitions" WHERE "eventId" = :eventId AND name = 'Test SubEvent M' LIMIT 1`, { eventId });
    if (existing && existing.length > 0 && existing[0]) {
        console.log(`ℹ️  SubEventCompetition already exists (${existing[0].id})\n`);
        return existing[0].id;
    }
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
 * Create draw competition (idempotent: returns existing if visualCode already exists).
 */
async function createDrawCompetition(ctx, subEventId, season) {
    console.log("🎲 Creating DrawCompetition...");
    const visualCode = `TEST-DRAW-${season}`;
    const existing = await ctx.query(`SELECT id FROM event."DrawCompetitions" WHERE "subeventId" = :subeventId AND "visualCode" = :visualCode LIMIT 1`, { subeventId: subEventId, visualCode });
    if (existing && existing.length > 0 && existing[0]) {
        console.log(`ℹ️  DrawCompetition already exists (${existing[0].id})\n`);
        return existing[0].id;
    }
    const draw = await ctx.insert(`INSERT INTO event."DrawCompetitions" ("subeventId", name, type, "visualCode", "createdAt", "updatedAt")
     VALUES (:subeventId, :name, :type, :visualCode, NOW(), NOW())
     RETURNING id`, {
        subeventId: subEventId,
        name: "Test Draw",
        type: "POULE",
        visualCode,
    });
    const drawId = draw.id;
    console.log(`✅ Created DrawCompetition (${drawId})\n`);
    return drawId;
}
/**
 * Create opponent team (always inserts; no idempotency check).
 */
async function createOpponentTeam(ctx, clubId, season, captainId, teamType = "M") {
    console.log("👥 Creating opponent Team...");
    const opponentTeamId = await insertTeam(ctx, clubId, season, captainId, teamType);
    console.log(`✅ Created opponent Team (${opponentTeamId})\n`);
    return opponentTeamId;
}
/**
 * Create encounters
 */
async function createEncounters(ctx, drawId, teamId, opponentTeamId, encounterCount = 10) {
    console.log("⚔️ Creating Encounters...");
    const now = new Date();
    const halfCount = Math.floor(encounterCount / 2);
    for (let i = 0; i < encounterCount; i++) {
        let encounterDate;
        if (i < halfCount) {
            // First half: dates before current date
            // Generate dates going backwards from current date with varying intervals
            // Use base interval of 5-6 days plus variation to avoid same weekday
            const baseDays = (halfCount - i) * 5;
            const variation = (i % 7) - 3; // Vary by -3 to +3 days
            const daysBefore = baseDays + variation;
            encounterDate = new Date(now);
            encounterDate.setDate(encounterDate.getDate() - daysBefore);
        }
        else {
            // Second half: dates after current date
            // Generate dates going forwards from current date with varying intervals
            // Use base interval of 5-6 days plus variation to avoid same weekday
            const baseDays = (i - halfCount + 1) * 5;
            const variation = (i % 7) - 3; // Vary by -3 to +3 days
            const daysAfter = baseDays + variation;
            encounterDate = new Date(now);
            encounterDate.setDate(encounterDate.getDate() + daysAfter);
        }
        // Validate the date
        if (isNaN(encounterDate.getTime())) {
            throw new Error(`Invalid date created: ${encounterDate}`);
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
/**
 * Create a location for a club (idempotent: check by name + clubId)
 */
async function createLocation(ctx, clubId, locationData) {
    const existing = await ctx.query(`SELECT id, name FROM event."Locations" WHERE name = :name AND "clubId" = :clubId LIMIT 1`, { name: locationData.name, clubId });
    if (existing && existing.length > 0) {
        console.log(`ℹ️  Location already exists: ${existing[0].name} (${existing[0].id})\n`);
        return existing[0];
    }
    const location = await ctx.insert(`INSERT INTO event."Locations" (name, address, street, "streetNumber", postalcode, city, state, phone, "clubId", "createdAt", "updatedAt")
     VALUES (:name, :address, :street, :streetNumber, :postalcode, :city, :state, :phone, :clubId, NOW(), NOW())
     RETURNING id, name`, { ...locationData, clubId });
    console.log(`✅ Created Location: ${location.name} (${location.id})\n`);
    return location;
}
/**
 * Create availability for a location (idempotent: check by locationId + season)
 */
async function createAvailability(ctx, locationId, season, days, exceptions = []) {
    const existing = await ctx.query(`SELECT id FROM event."Availabilities" WHERE "locationId" = :locationId AND season = :season LIMIT 1`, { locationId, season });
    if (existing && existing.length > 0) {
        console.log(`ℹ️  Availability already exists for this location/season (${existing[0].id})\n`);
        return existing[0];
    }
    const availability = await ctx.insert(`INSERT INTO event."Availabilities" ("locationId", season, days, exceptions, "createdAt", "updatedAt")
     VALUES (:locationId, :season, :days, :exceptions, NOW(), NOW())
     RETURNING id`, {
        locationId,
        season,
        days: JSON.stringify(days),
        exceptions: JSON.stringify(exceptions),
    });
    console.log(`✅ Created Availability (${availability.id}) for season ${season}\n`);
    return availability;
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
const createLocationWithErrorHandling = (0, error_handler_1.withErrorHandling)(createLocation, "creating location");
exports.createLocation = createLocationWithErrorHandling;
const createAvailabilityWithErrorHandling = (0, error_handler_1.withErrorHandling)(createAvailability, "creating availability");
exports.createAvailability = createAvailabilityWithErrorHandling;
