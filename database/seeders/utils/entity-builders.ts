import { SeederContext } from "./seeder-context";
import { withErrorHandling } from "./error-handler";
import { getClubById, generateTeamName } from "./club-team-naming";
import { hasActiveMembership } from "./membership-helpers";
import type {
  Player,
  Club,
  Team,
  EventCompetition,
  SubEventCompetition,
  DrawCompetition,
  Location,
  Availability,
} from "./types";

/**
 * Find or create a player
 */
async function findOrCreatePlayer(
  ctx: SeederContext,
  userEmail: string,
  firstName: string,
  lastName: string,
  memberId: string,
  gender: string,
  competitionPlayer: boolean,
  sub: string
): Promise<Player> {
  // Check if user already exists
  // Note: QueryTypes.SELECT returns the array directly, not [results, metadata]
  const existingUsers = await ctx.query<Player>(
    `SELECT id, email, "firstName", "lastName" FROM "Players" WHERE email = :email LIMIT 1`,
    { email: userEmail }
  );

  if (existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0];
    console.log(`✅ Found existing user: ${user.firstName} ${user.lastName} (${user.email})\n`);
    return user;
  }

  // Create new player
  console.log("👤 Creating new player...");
  const user = await ctx.insert<Player>(
    `INSERT INTO "Players" (email, "firstName", "lastName", "memberId", gender, "createdAt", "updatedAt", "competitionPlayer", "sub")
     VALUES (:email, :firstName, :lastName, :memberId, :gender, NOW(), NOW(),:competitionPlayer, :sub)
     RETURNING id, email, "firstName", "lastName"`,
    {
      email: userEmail,
      firstName,
      lastName,
      memberId,
      gender,
      competitionPlayer,
      sub,
    }
  );
  console.log(`✅ Created new player: ${user.firstName} ${user.lastName} (${user.email})\n`);
  return user;
}

/**
 * Create a club
 */
async function createClub(ctx: SeederContext, clubName: string): Promise<string> {
  console.log(`🏢 Creating Club: ${clubName}...`);
  // Generate abbreviation from club name (first 3 letters, uppercase)
  const abbreviation = clubName.substring(0, 3).toUpperCase();

  const club = await ctx.insert<Club>(
    `INSERT INTO "Clubs" (name, "teamName", "fullName", abbreviation, "useForTeamName", "createdAt", "updatedAt")
     VALUES (:name, :teamName, :fullName, :abbreviation, :useForTeamName, NOW(), NOW())
     RETURNING id, name`,
    {
      name: clubName,
      teamName: clubName,
      fullName: `${clubName} Full Name`,
      abbreviation,
      useForTeamName: "teamName",
    }
  );
  const clubId = club.id;
  console.log(`✅ Created Club: ${clubName} (${clubId})\n`);
  return clubId;
}

/**
 * Add player to club membership
 */
async function addPlayerToClub(
  ctx: SeederContext,
  clubId: string,
  playerId: string
): Promise<void> {
  const existing = await hasActiveMembership<{ id: string }>(
    ctx,
    "ClubPlayerMemberships",
    `"clubId" = :clubId AND "playerId" = :playerId`,
    { clubId, playerId }
  );

  if (existing) {
    console.log(`ℹ️  Player already has an active membership with this club\n`);
    return;
  }

  const row = await ctx.insert<{ id: string }>(
    `INSERT INTO "ClubPlayerMemberships" ("clubId", "playerId", "start", "confirmed", "membershipType", "createdAt", "updatedAt")
     VALUES (:clubId, :playerId, NOW(), true, 'NORMAL', NOW(), NOW())
     RETURNING id`,
    { clubId, playerId }
  );
  console.log(`✅ Added user to club (membership ID: ${row.id})\n`);
}

/**
 * Internal: insert a team row (used by createTeam and createOpponentTeam).
 */
async function insertTeam(
  ctx: SeederContext,
  clubId: string,
  season: number,
  captainId: string,
  teamType: "M" | "F" | "MX"
): Promise<string> {
  const club = await getClubById(ctx, clubId);
  const { name: teamName, abbreviation } = generateTeamName(club, 1, teamType, "H");

  const team = await ctx.insert<Team>(
    `INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "captainId", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, :captainId, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`,
    {
      clubId,
      type: teamType,
      season,
      captainId,
      name: teamName,
      abbreviation,
    }
  );
  return team.id;
}

/**
 * Create a team (idempotent: returns existing team if same club/season/type).
 */
async function createTeam(
  ctx: SeederContext,
  clubId: string,
  season: number,
  captainId: string,
  teamType: "M" | "F" | "MX" = "M"
): Promise<string> {
  console.log("👥 Creating Team...");

  const existing = await ctx.query<{ id: string }>(
    `SELECT id FROM "Teams" 
     WHERE "clubId" = :clubId AND season = :season AND type = :type AND "teamNumber" = 1
     LIMIT 1`,
    { clubId, season, type: teamType }
  );

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
async function addPlayerToTeam(
  ctx: SeederContext,
  teamId: string,
  playerId: string,
  membershipStart?: Date
): Promise<void> {
  // Check if membership already exists
  const existing = await hasActiveMembership<{ id: string }>(
    ctx,
    "TeamPlayerMemberships",
    `"teamId" = :teamId AND "playerId" = :playerId`,
    { teamId, playerId }
  );

  if (existing) {
    console.log(`ℹ️  Player already has an active membership with this team\n`);
    return;
  }

  const start = membershipStart ?? new Date();
  await ctx.rawQuery(
    `INSERT INTO "TeamPlayerMemberships" ("teamId", "playerId", "start", "membershipType", "createdAt", "updatedAt")
     VALUES (:teamId, :playerId, :start, 'REGULAR', NOW(), NOW())`,
    { teamId, playerId, start }
  );
  console.log(`✅ Added user to team\n`);
}

/**
 * Create event competition (idempotent: returns existing if visualCode already exists).
 */
async function createEventCompetition(ctx: SeederContext, season: number): Promise<string> {
  console.log("🏆 Creating EventCompetition...");
  const visualCode = `TEST-${season}`;
  const existing = await ctx.query<{ id: string }>(
    `SELECT id FROM event."EventCompetitions" WHERE "visualCode" = :visualCode LIMIT 1`,
    { visualCode }
  );
  if (existing && existing.length > 0 && existing[0]) {
    console.log(`ℹ️  EventCompetition already exists (${existing[0].id})\n`);
    return existing[0].id;
  }
  const event = await ctx.insert<EventCompetition>(
    `INSERT INTO event."EventCompetitions" (name, type, season, official, "visualCode", "createdAt", "updatedAt")
     VALUES (:name, :type, :season, true, :visualCode, NOW(), NOW())
     RETURNING id`,
    {
      name: `Test Event ${season}`,
      type: "PROV",
      season,
      visualCode,
    }
  );
  const eventId = event.id;
  console.log(`✅ Created EventCompetition (${eventId})\n`);
  return eventId;
}

/**
 * Create sub event competition (idempotent: returns existing if same eventId + name exists).
 */
async function createSubEventCompetition(ctx: SeederContext, eventId: string): Promise<string> {
  console.log("📋 Creating SubEventCompetition...");
  const existing = await ctx.query<{ id: string }>(
    `SELECT id FROM event."SubEventCompetitions" WHERE "eventId" = :eventId AND name = 'Test SubEvent M' LIMIT 1`,
    { eventId }
  );
  if (existing && existing.length > 0 && existing[0]) {
    console.log(`ℹ️  SubEventCompetition already exists (${existing[0].id})\n`);
    return existing[0].id;
  }
  const subEvent = await ctx.insert<SubEventCompetition>(
    `INSERT INTO event."SubEventCompetitions" ("eventId", name, "eventType", level, "maxLevel", "minBaseIndex", "maxBaseIndex", "createdAt", "updatedAt")
     VALUES (:eventId, :name, :eventType, 1, 6, 50, 70, NOW(), NOW())
     RETURNING id`,
    {
      eventId,
      name: "Test SubEvent M",
      eventType: "M",
    }
  );
  const subEventId = subEvent.id;
  console.log(`✅ Created SubEventCompetition (${subEventId})\n`);
  return subEventId;
}

/**
 * Create draw competition (idempotent: returns existing if visualCode already exists).
 */
async function createDrawCompetition(
  ctx: SeederContext,
  subEventId: string,
  season: number
): Promise<string> {
  console.log("🎲 Creating DrawCompetition...");
  const visualCode = `TEST-DRAW-${season}`;
  const existing = await ctx.query<{ id: string }>(
    `SELECT id FROM event."DrawCompetitions" WHERE "subeventId" = :subeventId AND "visualCode" = :visualCode LIMIT 1`,
    { subeventId: subEventId, visualCode }
  );
  if (existing && existing.length > 0 && existing[0]) {
    console.log(`ℹ️  DrawCompetition already exists (${existing[0].id})\n`);
    return existing[0].id;
  }
  const draw = await ctx.insert<DrawCompetition>(
    `INSERT INTO event."DrawCompetitions" ("subeventId", name, type, "visualCode", "createdAt", "updatedAt")
     VALUES (:subeventId, :name, :type, :visualCode, NOW(), NOW())
     RETURNING id`,
    {
      subeventId: subEventId,
      name: "Test Draw",
      type: "POULE",
      visualCode,
    }
  );
  const drawId = draw.id;
  console.log(`✅ Created DrawCompetition (${drawId})\n`);
  return drawId;
}

/**
 * Create opponent team (always inserts; no idempotency check).
 */
async function createOpponentTeam(
  ctx: SeederContext,
  clubId: string,
  season: number,
  captainId: string,
  teamType: "M" | "F" | "MX" = "M"
): Promise<string> {
  console.log("👥 Creating opponent Team...");
  const opponentTeamId = await insertTeam(ctx, clubId, season, captainId, teamType);
  console.log(`✅ Created opponent Team (${opponentTeamId})\n`);
  return opponentTeamId;
}

/**
 * Create encounters
 */
async function createEncounters(
  ctx: SeederContext,
  drawId: string,
  teamId: string,
  opponentTeamId: string,
  encounterCount = 10
): Promise<void> {
  console.log("⚔️ Creating Encounters...");
  const now = new Date();
  const halfCount = Math.floor(encounterCount / 2);

  for (let i = 0; i < encounterCount; i++) {
    let encounterDate: Date;

    if (i < halfCount) {
      // First half: dates before current date
      // Generate dates going backwards from current date with varying intervals
      // Use base interval of 5-6 days plus variation to avoid same weekday
      const baseDays = (halfCount - i) * 5;
      const variation = (i % 7) - 3; // Vary by -3 to +3 days
      const daysBefore = baseDays + variation;
      encounterDate = new Date(now);
      encounterDate.setDate(encounterDate.getDate() - daysBefore);
    } else {
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

    await ctx.rawQuery(
      `INSERT INTO event."EncounterCompetitions" 
       ("drawId", "homeTeamId", "awayTeamId", date, "originalDate", "homeScore", "awayScore", 
        finished, accepted, "homeCaptainPresent", "awayCaptainPresent", "gameLeaderPresent",
        "homeCaptainAccepted", "awayCaptainAccepted", "gameLeaderAccepted", "createdAt", "updatedAt")
       VALUES (:drawId, :homeTeamId, :awayTeamId, :date, :originalDate, :homeScore, :awayScore,
               :finished, :accepted, :homeCaptainPresent, :awayCaptainPresent, false,
               :homeCaptainAccepted, :awayCaptainAccepted, false, NOW(), NOW())`,
      {
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
      }
    );
  }
  console.log(`✅ Created ${encounterCount} Encounters\n`);
}

/**
 * Create a location for a club (idempotent: check by name + clubId)
 */
async function createLocation(
  ctx: SeederContext,
  clubId: string,
  locationData: {
    name: string;
    address: string;
    street: string;
    streetNumber: string;
    postalcode: string;
    city: string;
    state: string;
    phone: string;
  }
): Promise<Location> {
  const existing = await ctx.query<Location>(
    `SELECT id, name FROM event."Locations" WHERE name = :name AND "clubId" = :clubId LIMIT 1`,
    { name: locationData.name, clubId }
  );

  if (existing && existing.length > 0) {
    console.log(`ℹ️  Location already exists: ${existing[0].name} (${existing[0].id})\n`);
    return existing[0];
  }

  const location = await ctx.insert<Location>(
    `INSERT INTO event."Locations" (name, address, street, "streetNumber", postalcode, city, state, phone, "clubId", "createdAt", "updatedAt")
     VALUES (:name, :address, :street, :streetNumber, :postalcode, :city, :state, :phone, :clubId, NOW(), NOW())
     RETURNING id, name`,
    { ...locationData, clubId }
  );
  console.log(`✅ Created Location: ${location.name} (${location.id})\n`);
  return location;
}

/**
 * Create availability for a location (idempotent: check by locationId + season)
 */
async function createAvailability(
  ctx: SeederContext,
  locationId: string,
  season: number,
  days: unknown[],
  exceptions: unknown[] = []
): Promise<Availability> {
  const existing = await ctx.query<Availability>(
    `SELECT id FROM event."Availabilities" WHERE "locationId" = :locationId AND season = :season LIMIT 1`,
    { locationId, season }
  );

  if (existing && existing.length > 0) {
    console.log(`ℹ️  Availability already exists for this location/season (${existing[0].id})\n`);
    return existing[0];
  }

  const availability = await ctx.insert<Availability>(
    `INSERT INTO event."Availabilities" ("locationId", season, days, exceptions, "createdAt", "updatedAt")
     VALUES (:locationId, :season, :days, :exceptions, NOW(), NOW())
     RETURNING id`,
    {
      locationId,
      season,
      days: JSON.stringify(days),
      exceptions: JSON.stringify(exceptions),
    }
  );
  console.log(`✅ Created Availability (${availability.id}) for season ${season}\n`);
  return availability;
}

// Wrap all functions with error handling
const findOrCreatePlayerWithErrorHandling = withErrorHandling(
  findOrCreatePlayer,
  "finding/creating player"
);
const createClubWithErrorHandling = withErrorHandling(createClub, "creating club");
const addPlayerToClubWithErrorHandling = withErrorHandling(
  addPlayerToClub,
  "inserting ClubPlayerMembership"
);
const createTeamWithErrorHandling = withErrorHandling(createTeam, "creating team");
const addPlayerToTeamWithErrorHandling = withErrorHandling(
  addPlayerToTeam,
  "inserting TeamPlayerMembership"
);
const createEventCompetitionWithErrorHandling = withErrorHandling(
  createEventCompetition,
  "creating EventCompetition"
);
const createSubEventCompetitionWithErrorHandling = withErrorHandling(
  createSubEventCompetition,
  "creating SubEventCompetition"
);
const createDrawCompetitionWithErrorHandling = withErrorHandling(
  createDrawCompetition,
  "creating DrawCompetition"
);
const createOpponentTeamWithErrorHandling = withErrorHandling(
  createOpponentTeam,
  "creating opponent team"
);
const createEncountersWithErrorHandling = withErrorHandling(
  createEncounters,
  "creating encounters"
);
const createLocationWithErrorHandling = withErrorHandling(
  createLocation,
  "creating location"
);
const createAvailabilityWithErrorHandling = withErrorHandling(
  createAvailability,
  "creating availability"
);

export {
  findOrCreatePlayerWithErrorHandling as findOrCreatePlayer,
  createClubWithErrorHandling as createClub,
  addPlayerToClubWithErrorHandling as addPlayerToClub,
  createTeamWithErrorHandling as createTeam,
  addPlayerToTeamWithErrorHandling as addPlayerToTeam,
  createEventCompetitionWithErrorHandling as createEventCompetition,
  createSubEventCompetitionWithErrorHandling as createSubEventCompetition,
  createDrawCompetitionWithErrorHandling as createDrawCompetition,
  createOpponentTeamWithErrorHandling as createOpponentTeam,
  createEncountersWithErrorHandling as createEncounters,
  createLocationWithErrorHandling as createLocation,
  createAvailabilityWithErrorHandling as createAvailability,
};
