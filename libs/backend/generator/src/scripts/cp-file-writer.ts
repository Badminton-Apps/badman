/**
 * CpFileWriter: Standalone script for writing CpPayload data to a .cp (Access MDB) file.
 *
 * Runs ONLY on Windows (requires node-adodb / Jet OLEDB 4.0).
 * Intended to be executed on a GitHub Actions windows-latest runner.
 *
 * Usage: node cp-file-writer.js <payload.json> [--template <path>] [--output <path>]
 *
 * Environment:
 *   CP_PASS - Access database password
 */

import { existsSync } from "fs";
import { copyFile, readFile } from "fs/promises";
import { join, resolve } from "path";
import {
  CpClub,
  CpEntry,
  CpLocation,
  CpMemo,
  CpPayload,
  CpPlayer,
  CpSubEvent,
  CpTeam,
  CpTeamPlayer,
} from "../interfaces/cp-payload.interface";

interface AdodbConnection {
  query<T>(sql: string): Promise<T>;
  execute<T>(sql: string, scalar?: string): Promise<T>;
  transaction<T>(sql: string[]): Promise<T>;
}

type Identity = { id: number }[];

type StageNames = "Main Draw" | "Reserves" | "Uitloten";

const STAGES: { name: StageNames; displayOrder: number; stagetype: number }[] = [
  { name: "Main Draw", displayOrder: 1, stagetype: 1 },
  { name: "Reserves", displayOrder: 9998, stagetype: 9998 },
  { name: "Uitloten", displayOrder: 9999, stagetype: 9999 },
];

function jetEscape(str?: string | null): string {
  if (str == null) return "";
  return str.replace(/"/g, '""').trim();
}

function jetString(str?: string | null): string {
  return `"${jetEscape(str)}"`;
}

/**
 * Validate that the payload has the minimum required structure.
 * Catches corrupted/truncated JSON early with a clear message.
 */
function validatePayload(payload: CpPayload): void {
  if (!payload.event?.name) {
    throw new Error("Invalid payload: missing event.name");
  }
  if (!payload.settings?.tournamentName) {
    throw new Error("Invalid payload: missing settings.tournamentName");
  }
  if (!Array.isArray(payload.subEvents)) {
    throw new Error("Invalid payload: subEvents must be an array");
  }
  if (!Array.isArray(payload.clubs)) {
    throw new Error("Invalid payload: clubs must be an array");
  }
  if (!Array.isArray(payload.teams)) {
    throw new Error("Invalid payload: teams must be an array");
  }
  if (!Array.isArray(payload.players)) {
    throw new Error("Invalid payload: players must be an array");
  }
  if (!Array.isArray(payload.entries)) {
    throw new Error("Invalid payload: entries must be an array");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const payloadPath = args[0];

  if (!payloadPath) {
    console.error("Usage: cp-file-writer.js <payload.json> [--template <path>] [--output <path>]");
    process.exit(1);
  }

  const templateIdx = args.indexOf("--template");
  const outputIdx = args.indexOf("--output");

  const templatePath =
    templateIdx >= 0
      ? args[templateIdx + 1]
      : join(process.cwd(), "libs/backend/generator/assets/empty.cp");

  // Parse and validate payload
  let payload: CpPayload;
  try {
    const payloadRaw = await readFile(payloadPath, "utf-8");
    payload = JSON.parse(payloadRaw);
  } catch (e) {
    console.error(`Failed to read/parse payload file: ${payloadPath}`, e);
    process.exit(1);
  }

  validatePayload(payload!);

  const outputPath =
    outputIdx >= 0 ? args[outputIdx + 1] : join(process.cwd(), `${payload.event.name}.cp`);

  const password = process.env["CP_PASS"];
  if (!password) {
    console.error("CP_PASS environment variable is required");
    process.exit(1);
  }

  if (!existsSync(templatePath)) {
    console.error(`Template file not found: ${templatePath}`);
    process.exit(1);
  }

  console.log(`Copying template: ${templatePath} → ${outputPath}`);
  await copyFile(templatePath, outputPath);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let ADODB;
  try {
    ADODB = require("node-adodb");
  } catch (e) {
    console.error(
      "node-adodb is not available. This script must run on Windows with Jet OLEDB 4.0.",
      e
    );
    process.exit(1);
  }

  const connection: AdodbConnection = ADODB.open(
    `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${resolve(outputPath)};Jet OLEDB:Database Password=${password}`
  );

  console.log("Preparing CP file...");
  await prepCpFile(connection, payload);

  console.log(`Adding ${payload.subEvents.length} events...`);
  const eventIdMap = await addEvents(connection, payload.subEvents);

  console.log(`Adding ${payload.clubs.length} clubs...`);
  const clubIdMap = await addClubs(connection, payload.clubs);

  console.log(`Adding ${payload.locations.length} locations...`);
  const locationIdMap = await addLocations(connection, payload.locations, clubIdMap);

  console.log(`Adding ${payload.teams.length} teams...`);
  const teamIdMap = await addTeams(connection, payload.teams, clubIdMap, locationIdMap);

  console.log(`Adding ${payload.entries.length} entries...`);
  await addEntries(connection, payload.entries, eventIdMap, teamIdMap);

  console.log(`Adding ${payload.players.length} players...`);
  await addPlayers(connection, payload.players, payload.teamPlayers, clubIdMap, teamIdMap);

  console.log(`Adding ${payload.memos.length} memos...`);
  await addMemos(connection, payload.memos, teamIdMap);

  console.log(`CP file generated: ${resolve(outputPath)}`);
}

// Export for testing
export { jetEscape, jetString, validatePayload };

async function prepCpFile(connection: AdodbConnection, payload: CpPayload): Promise<void> {
  const queries = [
    "DELETE FROM TournamentDay;",
    "DELETE FROM stageentry;",
    "DELETE FROM League;",
    "DELETE FROM Entry;",
    "DELETE FROM TeamPlayer;",
    "DELETE FROM PlayerlevelEntry;",
    "DELETE FROM Team;",
    "DELETE FROM Court;",
    "DELETE FROM Location;",
    "DELETE FROM Player;",
    "DELETE FROM Club;",
    "DELETE FROM Event;",
    "DELETE FROM stage;",
    // Default leagues
    'INSERT INTO League(id, name) VALUES(1, "Heren");',
    'INSERT INTO League(id, name) VALUES(2, "Dames");',
    'INSERT INTO League(id, name) VALUES(3, "Gemengd");',
    'UPDATE SettingsMemo SET [value] = NULL where [name] = "TournamentLogo"',
    // New file: set unicode and tournament name
    `UPDATE settings SET [value] = "${new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .substring(0, 18)}" where [name] = "unicode"`,
    'UPDATE settings SET [value] = NULL where [name] = "director" or [name] = "DirectorEmail" or [name] = "DirectorPhone" or [name] = "LocationAddress1" or [name] = "LocationPostalCode" or [name] = "LocationCity" or [name] = "LocationState" or [name] = "Location"',
    `UPDATE settings SET [value] = ${jetString(payload.settings.tournamentName)} where [name] = "tournament"`,
  ];

  await connection.transaction(queries);
}

async function addEvents(
  connection: AdodbConnection,
  subEvents: CpSubEvent[]
): Promise<Map<string, { cpId: number; stages: Record<StageNames, number> }>> {
  const map = new Map<string, { cpId: number; stages: Record<StageNames, number> }>();

  for (const subEvent of subEvents) {
    const query = `INSERT INTO Event(name, gender, eventtype, league, sortorder) VALUES(${jetString(subEvent.name)}, ${subEvent.gender}, 2, ${subEvent.gender}, ${subEvent.sortOrder});`;
    const res = await connection.execute<Identity>(query, "SELECT @@Identity AS id");
    const cpId = res[0].id;

    const stages: Record<StageNames, number> = {
      "Main Draw": -1,
      Reserves: -1,
      Uitloten: -1,
    };

    for (const stage of STAGES) {
      const stageQuery = `INSERT INTO stage(name, event, displayorder, stagetype) VALUES("${stage.name}", "${cpId}", "${stage.displayOrder}", "${stage.stagetype}");`;
      const stageRes = await connection.execute<Identity>(stageQuery, "SELECT @@Identity AS id");
      stages[stage.name] = stageRes[0].id;
    }

    map.set(subEvent.refId, { cpId, stages });
  }

  return map;
}

async function addClubs(
  connection: AdodbConnection,
  clubs: CpClub[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  for (const club of clubs) {
    const query = `INSERT INTO Club(name, clubId, country, abbreviation) VALUES(${jetString(club.name)}, "${jetEscape(String(club.clubId))}", ${club.country}, "${jetEscape(club.abbreviation)}")`;
    const res = await connection.execute<Identity>(query, "SELECT @@Identity AS id");
    map.set(club.refId, res[0].id);
  }

  return map;
}

async function addLocations(
  connection: AdodbConnection,
  locations: CpLocation[],
  clubIdMap: Map<string, number>
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  for (const loc of locations) {
    const clubCpId = clubIdMap.get(loc.clubRefId);
    if (clubCpId == null) continue;

    const query = `INSERT INTO Location(name, address, postalcode, city, phone, clubid) VALUES(${jetString(loc.name)}, ${jetString(loc.address)}, "${jetEscape(loc.postalcode)}", "${jetEscape(loc.city)}", "${jetEscape(loc.phone)}", ${clubCpId})`;
    const res = await connection.execute<Identity>(query, "SELECT @@Identity AS id");
    map.set(loc.refId, res[0].id);
  }

  return map;
}

async function addTeams(
  connection: AdodbConnection,
  teams: CpTeam[],
  clubIdMap: Map<string, number>,
  locationIdMap: Map<string, number>
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  for (const team of teams) {
    const clubCpId = clubIdMap.get(team.clubRefId);
    if (clubCpId == null) continue;

    const prefLoc =
      team.preferredLocationRefId != null
        ? (locationIdMap.get(team.preferredLocationRefId) ?? "NULL")
        : "NULL";
    const plantime = team.planTime ? `#${team.planTime}#` : "NULL";
    const dayofweek = team.dayOfWeek ?? "NULL";

    const query = `INSERT INTO Team(name, club, country, entrydate, contact, phone, email, dayofweek, plantime, preferredlocation1) VALUES(${jetString(team.name)}, ${clubCpId}, ${team.country}, #${team.entryDate}#, "${jetEscape(team.contact)}", "${jetEscape(team.phone)}", "${jetEscape(team.email)}", ${dayofweek}, ${plantime}, ${prefLoc})`;

    try {
      const res = await connection.execute<Identity>(query, "SELECT @@Identity AS id");
      map.set(team.refId, res[0].id);
    } catch (e) {
      console.error(`Error inserting team ${team.name}:`, e);
    }
  }

  return map;
}

async function addEntries(
  connection: AdodbConnection,
  entries: CpEntry[],
  eventIdMap: Map<string, { cpId: number; stages: Record<StageNames, number> }>,
  teamIdMap: Map<string, number>
): Promise<void> {
  for (const entry of entries) {
    const teamCpId = teamIdMap.get(entry.teamRefId);
    const eventData = eventIdMap.get(entry.subEventRefId);
    if (teamCpId == null || eventData == null) continue;

    const entryQuery = `INSERT INTO Entry(event, team) VALUES("${eventData.cpId}", "${teamCpId}")`;
    const res = await connection.execute<Identity>(entryQuery, "SELECT @@Identity AS id");

    const stageQuery = `INSERT INTO stageentry(entry, stage) VALUES(${res[0].id}, ${eventData.stages["Main Draw"]})`;
    await connection.execute(stageQuery);
  }
}

async function addPlayers(
  connection: AdodbConnection,
  players: CpPlayer[],
  teamPlayers: CpTeamPlayer[],
  clubIdMap: Map<string, number>,
  teamIdMap: Map<string, number>
): Promise<void> {
  const playerIdMap = new Map<string, number>();
  const batchQueries: string[] = [];

  for (const player of players) {
    const clubCpId = clubIdMap.get(player.clubRefId);
    if (clubCpId == null) continue;

    const query = `INSERT INTO Player(name, firstname, gender, memberid, club, foreignid, dob) VALUES(${jetString(player.lastName)}, ${jetString(player.firstName)}, ${player.gender}, ${jetString(player.memberId)}, ${clubCpId}, NULL, NULL)`;
    const res = await connection.execute<Identity>(query, "SELECT @@Identity AS id");
    const cpId = res[0].id;
    playerIdMap.set(player.refId, cpId);

    batchQueries.push(
      `INSERT INTO PlayerlevelEntry(leveltype, playerid, level1, level2, level3) VALUES(1, ${cpId}, ${player.levels.single}, ${player.levels.double}, ${player.levels.mix})`
    );
  }

  // Add team-player associations
  for (const tp of teamPlayers) {
    const teamCpId = teamIdMap.get(tp.teamRefId);
    const playerCpId = playerIdMap.get(tp.playerRefId);
    if (teamCpId == null || playerCpId == null) continue;

    batchQueries.push(
      `INSERT INTO TeamPlayer(team, player, status) VALUES(${teamCpId}, ${playerCpId}, ${tp.status})`
    );
  }

  if (batchQueries.length > 0) {
    await connection.transaction(batchQueries);
  }
}

async function addMemos(
  connection: AdodbConnection,
  memos: CpMemo[],
  teamIdMap: Map<string, number>
): Promise<void> {
  const queries: string[] = [];

  for (const memo of memos) {
    const teamCpId = teamIdMap.get(memo.teamRefId);
    if (teamCpId == null) continue;

    queries.push(`UPDATE Team SET [memo] = ${jetString(memo.memo)} WHERE id = ${teamCpId}`);
  }

  if (queries.length > 0) {
    await connection.transaction(queries);
  }
}

// Only run when executed directly (not when imported by tests)
if (require.main === module) {
  main().catch((e) => {
    console.error("CP file generation failed:", e);
    process.exit(1);
  });
}
