/**
 * Test Suite 2: CpFileWriter
 *
 * Split into two parts:
 *
 * 1. CROSS-PLATFORM UNIT TESTS (run anywhere, including macOS/Linux)
 *    - Tests for jetEscape, jetString, validatePayload
 *    - No ADODB dependency
 *
 * 2. WINDOWS-ONLY INTEGRATION TESTS (run only on windows-latest in CI)
 *    - End-to-end: payload → .cp file → verify with ADODB queries
 *    - Skipped automatically on non-Windows platforms
 */

import { CpPayload } from "../interfaces/cp-payload.interface";
import { jetEscape, jetString, validatePayload } from "./cp-file-writer";

// ─── Cross-platform unit tests ────────────────────────────────────

describe("jetEscape", () => {
  it("should return empty string for null/undefined", () => {
    expect(jetEscape(null)).toBe("");
    expect(jetEscape(undefined)).toBe("");
  });

  it("should escape double quotes by doubling them", () => {
    expect(jetEscape('Sporthal "De Grote" Hal')).toBe('Sporthal ""De Grote"" Hal');
  });

  it("should trim whitespace", () => {
    expect(jetEscape("  hello  ")).toBe("hello");
  });

  it("should handle Belgian names with accents", () => {
    expect(jetEscape("Degrève")).toBe("Degrève");
    expect(jetEscape("Müller")).toBe("Müller");
  });

  it("should handle single quotes (pass through, not escaped)", () => {
    expect(jetEscape("O'Brien")).toBe("O'Brien");
  });

  it("should handle empty string", () => {
    expect(jetEscape("")).toBe("");
  });
});

describe("jetString", () => {
  it("should wrap in double quotes", () => {
    expect(jetString("hello")).toBe('"hello"');
  });

  it("should return empty quoted string for null", () => {
    expect(jetString(null)).toBe('""');
  });

  it("should escape inner double quotes", () => {
    expect(jetString('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("validatePayload", () => {
  function minimalPayload(): CpPayload {
    return {
      event: { name: "Test", season: 2025 },
      subEvents: [],
      clubs: [],
      locations: [],
      teams: [],
      players: [],
      teamPlayers: [],
      entries: [],
      memos: [],
      settings: { tournamentName: "Test" },
    };
  }

  it("should accept a valid minimal payload", () => {
    expect(() => validatePayload(minimalPayload())).not.toThrow();
  });

  it("should reject payload without event.name", () => {
    const payload = minimalPayload();
    payload.event.name = "";
    expect(() => validatePayload(payload)).toThrow("event.name");
  });

  it("should reject payload without settings.tournamentName", () => {
    const payload = minimalPayload();
    payload.settings.tournamentName = "";
    expect(() => validatePayload(payload)).toThrow("settings.tournamentName");
  });

  it("should reject payload with non-array subEvents", () => {
    const payload = minimalPayload();
    (payload as any).subEvents = "not an array";
    expect(() => validatePayload(payload)).toThrow("subEvents");
  });

  it("should reject payload with non-array clubs", () => {
    const payload = minimalPayload();
    (payload as any).clubs = null;
    expect(() => validatePayload(payload)).toThrow("clubs");
  });

  it("should reject payload with non-array teams", () => {
    const payload = minimalPayload();
    (payload as any).teams = {};
    expect(() => validatePayload(payload)).toThrow("teams");
  });

  it("should reject payload with non-array players", () => {
    const payload = minimalPayload();
    (payload as any).players = undefined;
    expect(() => validatePayload(payload)).toThrow("players");
  });

  it("should reject payload with non-array entries", () => {
    const payload = minimalPayload();
    (payload as any).entries = 42;
    expect(() => validatePayload(payload)).toThrow("entries");
  });
});

// ─── Windows-only integration tests ───────────────────────────────

const isWindows = process.platform === "win32";
const describeIfWindows = isWindows ? describe : describe.skip;

function createTestPayload(): CpPayload {
  return {
    event: { name: "Test Event 2025", season: 2025 },
    subEvents: [
      { refId: "se-1", name: "Heren A", gender: 1, sortOrder: 0 },
      { refId: "se-2", name: "Dames A", gender: 2, sortOrder: 1 },
    ],
    clubs: [
      {
        refId: "club-1",
        name: "BC Test",
        clubId: "12345",
        country: 19,
        abbreviation: "BCT",
      },
      {
        refId: "club-2",
        name: "BC O'Brien",
        clubId: "67890",
        country: 19,
        abbreviation: "BCO",
      },
    ],
    locations: [
      {
        refId: "loc-1",
        clubRefId: "club-1",
        name: "Sporthal Test",
        address: "Teststraat 42",
        postalcode: "1000",
        city: "Brussel",
        phone: "02 123 45 67",
      },
    ],
    teams: [
      {
        refId: "team-1",
        clubRefId: "club-1",
        subEventRefId: "se-1",
        name: "BC Test (1)",
        country: 19,
        entryDate: "01/15/2025 10:00:00",
        contact: "Jan Janssens",
        phone: "0123456789",
        email: "jan@test.be",
        dayOfWeek: 3,
        planTime: "20:00",
        preferredLocationRefId: "loc-1",
      },
      {
        refId: "team-2",
        clubRefId: "club-2",
        subEventRefId: "se-2",
        name: "BC O'Brien (1)",
        country: 19,
        entryDate: "01/16/2025 11:00:00",
        contact: "Marie O'Brien",
        phone: null,
        email: null,
        dayOfWeek: 5,
        planTime: null,
        preferredLocationRefId: null,
      },
    ],
    players: [
      {
        refId: "player-1",
        clubRefId: "club-1",
        lastName: "Janssens",
        firstName: "Jan",
        gender: 1,
        memberId: "50001",
        levels: { single: 5, double: 4, mix: 3 },
      },
      {
        refId: "player-2",
        clubRefId: "club-2",
        lastName: "O'Brien",
        firstName: "Marie",
        gender: 2,
        memberId: "50002",
        levels: { single: 8, double: 7, mix: -1 },
      },
    ],
    teamPlayers: [
      { teamRefId: "team-1", playerRefId: "player-1", status: 1 },
      { teamRefId: "team-2", playerRefId: "player-2", status: 1 },
    ],
    entries: [
      { teamRefId: "team-1", subEventRefId: "se-1" },
      { teamRefId: "team-2", subEventRefId: "se-2" },
    ],
    memos: [
      {
        teamRefId: "team-1",
        memo: "--==[Fouten]==--\nTest error message\n\n",
      },
    ],
    settings: { tournamentName: "Test Event 2025" },
  };
}

describeIfWindows("CpFileWriter integration (Windows-only)", () => {
  const { existsSync } = require("fs");
  const { unlink, writeFile } = require("fs/promises");
  const { join } = require("path");

  const outputPath = join(process.cwd(), "test-output.cp");
  const payloadPath = join(process.cwd(), "test-payload.json");
  const templatePath = join(process.cwd(), "libs/backend/generator/assets/empty.cp");

  beforeAll(async () => {
    if (!existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}. Run tests from repo root.`);
    }
    if (!process.env["CP_PASS"]) {
      throw new Error("CP_PASS environment variable is required for these tests.");
    }
  });

  afterAll(async () => {
    for (const f of [outputPath, payloadPath]) {
      if (existsSync(f)) await unlink(f);
    }
  });

  it("should generate a valid .cp file from a test payload", async () => {
    const payload = createTestPayload();
    await writeFile(payloadPath, JSON.stringify(payload));

    const { execSync } = require("child_process");
    execSync(
      `node dist/libs/backend/generator/scripts/cp-file-writer.js ${payloadPath} --output ${outputPath}`,
      {
        env: { ...process.env },
        stdio: "pipe",
      }
    );

    expect(existsSync(outputPath)).toBe(true);
  });

  it("should have correct row counts", async () => {
    const ADODB = require("node-adodb");
    const conn = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${outputPath};Jet OLEDB:Database Password=${process.env["CP_PASS"]}`
    );

    const events = await conn.query("SELECT COUNT(*) as cnt FROM Event");
    expect(events[0].cnt).toBe(2);

    const clubs = await conn.query("SELECT COUNT(*) as cnt FROM Club");
    expect(clubs[0].cnt).toBe(2);

    const locations = await conn.query("SELECT COUNT(*) as cnt FROM Location");
    expect(locations[0].cnt).toBe(1);

    const teams = await conn.query("SELECT COUNT(*) as cnt FROM Team");
    expect(teams[0].cnt).toBe(2);

    const players = await conn.query("SELECT COUNT(*) as cnt FROM Player");
    expect(players[0].cnt).toBe(2);

    const entries = await conn.query("SELECT COUNT(*) as cnt FROM Entry");
    expect(entries[0].cnt).toBe(2);

    const leagues = await conn.query("SELECT COUNT(*) as cnt FROM League");
    expect(leagues[0].cnt).toBe(3);
  });

  it("should have correct cross-references", async () => {
    const ADODB = require("node-adodb");
    const conn = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${outputPath};Jet OLEDB:Database Password=${process.env["CP_PASS"]}`
    );

    const locs = await conn.query(
      "SELECT l.clubid, c.name FROM Location l INNER JOIN Club c ON l.clubid = c.id"
    );
    expect(locs).toHaveLength(1);
    expect(locs[0].name).toBe("BC Test");

    const tps = await conn.query(
      "SELECT tp.team, tp.player, t.name as teamName, p.name as playerName FROM TeamPlayer tp INNER JOIN Team t ON tp.team = t.id INNER JOIN Player p ON tp.player = p.id"
    );
    expect(tps).toHaveLength(2);
  });

  it("should have settings written correctly", async () => {
    const ADODB = require("node-adodb");
    const conn = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${outputPath};Jet OLEDB:Database Password=${process.env["CP_PASS"]}`
    );

    const settings = await conn.query('SELECT [value] FROM settings WHERE [name] = "tournament"');
    expect(settings[0].value).toBe("Test Event 2025");
  });

  it("should have memos written on the correct team", async () => {
    const ADODB = require("node-adodb");
    const conn = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${outputPath};Jet OLEDB:Database Password=${process.env["CP_PASS"]}`
    );

    const teamsWithMemo = await conn.query(
      "SELECT name, memo FROM Team WHERE memo IS NOT NULL AND LEN(memo) > 0"
    );
    expect(teamsWithMemo).toHaveLength(1);
    expect(teamsWithMemo[0].name).toContain("BC Test");
    expect(teamsWithMemo[0].memo).toContain("Fouten");
  });
});
