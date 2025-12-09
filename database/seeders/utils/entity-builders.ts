import { SeederContext } from "./seeder-context";
import { withErrorHandling } from "./error-handler";
import { getClubById, generateTeamName, hasActiveMembership } from "./team-helpers";
import type {
  Player,
  Club,
  Team,
  ClubMembership,
  EventCompetition,
  SubEventCompetition,
  DrawCompetition,
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
  // Check if membership already exists
  const existing = await hasActiveMembership<ClubMembership>(
    ctx,
    "ClubPlayerMemberships",
    `"clubId" = :clubId AND "playerId" = :playerId`,
    { clubId, playerId }
  );

  if (existing) {
    console.log(`ℹ️  Player already has an active membership with this club\n`);
    return;
  }

  // Note: QueryTypes.INSERT returns [results, metadata], so we need to destructure
  const queryResult = await ctx.sequelize.query(
    `INSERT INTO "ClubPlayerMemberships" ("clubId", "playerId", "start", "confirmed", "membershipType", "createdAt", "updatedAt")
     VALUES (:clubId, :playerId, NOW(), true, 'NORMAL', NOW(), NOW())
     RETURNING id`,
    {
      replacements: { clubId, playerId },

      type: ctx.QueryTypes.INSERT as any,
      transaction: ctx.transaction,
    }
  );
  const result = queryResult[0] as unknown as ClubMembership[] | undefined;

  // Verify the insert succeeded
  if (!result || !result[0] || !result[0].id) {
    throw new Error("Failed to insert ClubPlayerMembership - no ID returned");
  }

  console.log(`✅ Added user to club (membership ID: ${result[0].id})\n`);
}

/**
 * Create a team
 */
async function createTeam(
  ctx: SeederContext,
  clubId: string,
  season: number,
  captainId: string
): Promise<string> {
  console.log("👥 Creating Team...");

  // Check if team already exists
  const existing = await ctx.query<{ id: string }>(
    `SELECT id FROM "Teams" 
     WHERE "clubId" = :clubId AND season = :season AND type = :type AND "teamNumber" = 1
     LIMIT 1`,
    { clubId, season, type: "M" }
  );

  if (existing && existing.length > 0 && existing[0]) {
    console.log(`ℹ️  Team already exists for this club/season (ID: ${existing[0].id})\n`);
    return existing[0].id;
  }

  // Fetch club and generate team name
  const club = await getClubById(ctx, clubId);
  const { name: teamName, abbreviation } = generateTeamName(club, 1, "M", "H");

  const team = await ctx.insert<Team>(
    `INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "captainId", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, :captainId, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`,
    {
      clubId,
      type: "M",
      season,
      captainId,
      name: teamName,
      abbreviation,
    }
  );
  const teamId = team.id;
  console.log(`✅ Created Team (${teamId})\n`);
  return teamId;
}

/**
 * Add player to team membership
 */
async function addPlayerToTeam(
  ctx: SeederContext,
  teamId: string,
  playerId: string
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

  await ctx.rawQuery(
    `INSERT INTO "TeamPlayerMemberships" ("teamId", "playerId", "start", "membershipType", "createdAt", "updatedAt")
     VALUES (:teamId, :playerId, NOW(), 'REGULAR', NOW(), NOW())`,
    { teamId, playerId }
  );
  console.log(`✅ Added user to team\n`);
}

/**
 * Create event competition
 */
async function createEventCompetition(ctx: SeederContext, season: number): Promise<string> {
  console.log("🏆 Creating EventCompetition...");
  const event = await ctx.insert<EventCompetition>(
    `INSERT INTO event."EventCompetitions" (name, type, season, official, "visualCode", "createdAt", "updatedAt")
     VALUES (:name, :type, :season, true, :visualCode, NOW(), NOW())
     RETURNING id`,
    {
      name: `Test Event ${season}`,
      type: "PROV",
      season,
      visualCode: `TEST-${season}`,
    }
  );
  const eventId = event.id;
  console.log(`✅ Created EventCompetition (${eventId})\n`);
  return eventId;
}

/**
 * Create sub event competition
 */
async function createSubEventCompetition(ctx: SeederContext, eventId: string): Promise<string> {
  console.log("📋 Creating SubEventCompetition...");
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
 * Create draw competition
 */
async function createDrawCompetition(
  ctx: SeederContext,
  subEventId: string,
  season: number
): Promise<string> {
  console.log("🎲 Creating DrawCompetition...");
  const draw = await ctx.insert<DrawCompetition>(
    `INSERT INTO event."DrawCompetitions" ("subeventId", name, type, "visualCode", "createdAt", "updatedAt")
     VALUES (:subeventId, :name, :type, :visualCode, NOW(), NOW())
     RETURNING id`,
    {
      subeventId: subEventId,
      name: "Test Draw",
      type: "POULE",
      visualCode: `TEST-DRAW-${season}`,
    }
  );
  const drawId = draw.id;
  console.log(`✅ Created DrawCompetition (${drawId})\n`);
  return drawId;
}

/**
 * Create opponent team
 */
async function createOpponentTeam(
  ctx: SeederContext,
  clubId: string,
  season: number
): Promise<string> {
  console.log("👥 Creating opponent Team...");

  // Fetch club and generate team name
  const club = await getClubById(ctx, clubId);
  const { name: teamName, abbreviation } = generateTeamName(club, 1, "M", "H");

  const opponentTeam = await ctx.insert<Team>(
    `INSERT INTO "Teams" ("clubId", type, season, "teamNumber", "link", name, abbreviation, "createdAt", "updatedAt")
     VALUES (:clubId, :type, :season, 1, gen_random_uuid(), :name, :abbreviation, NOW(), NOW())
     RETURNING id`,
    {
      clubId,
      type: "M",
      season,
      name: teamName,
      abbreviation,
    }
  );
  const opponentTeamId = opponentTeam.id;
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
  season: number,
  encounterCount = 10
): Promise<void> {
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
};
