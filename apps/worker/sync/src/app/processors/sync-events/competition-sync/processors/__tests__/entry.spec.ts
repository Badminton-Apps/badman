/**
 * Unit tests for CompetitionSyncEntryProcessor._updateTeamDataFromVisual
 *
 * Context
 * ────────
 * Before the fix, _updateTeamDataFromVisual fetched `rankingPlaces[0]` — the
 * most-recent weekly row — and used its values to overwrite entry.meta.  For
 * players who became inactive in single/mix after May, those rows have
 * `single=null` and `mix=null`, causing the frontend to display 12-12-12 and
 * producing wrong team indexes (the Shauni Goethals / Smash For Fun 1G bug).
 *
 * The fix:
 *  A. Player.findAll include uses `rankingDate <= June 10 of season` (same
 *     cutoff as IndexCalculationService) so the May snapshot row is targeted.
 *  B. Level assignment uses `existingPlayerMeta?.single ?? ranking?.single ?? 12`
 *     so that any value already in entry.meta (e.g. Jeroen's manual correction)
 *     is preserved — the sync can never overwrite a deliberate admin edit.
 *
 * Scenarios covered
 * ─────────────────
 *  1. Season guard: _updateTeamDataFromVisual is called only before Sep 1.
 *  2. June 10 cutoff is passed to Player.findAll's rankingPlaces include.
 *  3. Player with full May snapshot → correct levels stored.
 *  4. Player with null single/mix after May + no existing meta → fallback 12.
 *  5. Player with null single/mix + existing meta (Jeroen's correction) → meta preserved.
 *  6. Multiple players, mixed situations → each player handled independently.
 *  7. Player not found in DB → id undefined, all levels default to 12.
 *  8. Visual API getDraw returns null/no structure → entry.save not called.
 *  9. Team not found in draw structure → entry.save not called.
 * 10. xmlTeam has no players → existing meta kept; entry.save not called.
 * 11. levelException / levelExceptionReason flags preserved from existing meta.
 * 12. GenderID mapping: 1 → "M", anything else → "F".
 */

// ─── Module-level mocks (hoisted before imports) ────────────────────────────

jest.mock("@badman/backend-database", () => ({
  Club: { findAll: jest.fn() },
  EventEntry: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data }),
  })),
  Team: { findAll: jest.fn() },
  Player: { findAll: jest.fn() },
}));

jest.mock("sequelize", () => {
  // Declare symbols inside the factory so they survive hoisting
  const Op = {
    in: Symbol("Op.in"),
    lte: Symbol("Op.lte"),
    eq: Symbol("Op.eq"),
    or: Symbol("Op.or"),
    and: Symbol("Op.and"),
    ne: Symbol("Op.ne"),
    like: Symbol("Op.like"),
    iLike: Symbol("Op.iLike"),
    notIn: Symbol("Op.notIn"),
  };
  return { Op };
});

jest.mock("date-fns", () => ({
  isBefore: jest.fn(),
}));

// Decorator no-ops
jest.mock("@badman/backend-queue", () => ({
  SyncQueue: "sync",
  Sync: { CheckRanking: "check-ranking" },
}));

jest.mock("@badman/backend-visual", () => ({
  VisualService: jest.fn(),
}));

jest.mock("@badman/utils", () => ({
  runParallel: (tasks: Array<Promise<unknown>>, _n: number) => Promise.all(tasks),
  LevelType: {},
  SubEventTypeEnum: {},
  teamValues: jest.fn().mockReturnValue({}),
}));

jest.mock("../../../../../utils", () => ({
  correctWrongTeams: jest.fn().mockResolvedValue([]),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { isBefore } from "date-fns";
import { Op } from "sequelize";
import { Player } from "@badman/backend-database";
import { CompetitionSyncEntryProcessor } from "../entry";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const SEASON = 2026;
const JUNE_10_CUTOFF = new Date(SEASON, 5, 10); // month 5 = June (0-indexed)

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: "team-uuid-1",
    name: "Smash For Fun 1G",
    season: SEASON,
    phone: null,
    email: null,
    type: "MX",
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEntry(metaPlayers: EntryPlayerMeta[] | null = null) {
  const meta = metaPlayers ? { competition: { players: metaPlayers } } : null;
  return {
    id: "entry-uuid-1",
    meta,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

interface EntryPlayerMeta {
  id?: string;
  single?: number;
  double?: number;
  mix?: number;
  gender?: "M" | "F";
  levelException?: boolean;
  levelExceptionRequested?: boolean;
  levelExceptionReason?: string;
}

function makeXmlDraw(teamName: string, teamCode = "T-001") {
  return {
    Structure: {
      Item: [{ Team: { Name: teamName, Code: teamCode } }],
    },
  };
}

function makeXmlTeam(players: Array<{ MemberID: string; GenderID: number }>) {
  return {
    Players: { Player: players },
  };
}

function makeDbPlayer(overrides: {
  id: string;
  memberId: string;
  rankingPlaces?: Array<{ single: number | null; double: number | null; mix: number | null }>;
}) {
  return {
    id: overrides.id,
    memberId: overrides.memberId,
    rankingPlaces: overrides.rankingPlaces ?? [],
  };
}

function makeProcessor() {
  const visualService = {
    getDraw: jest.fn(),
    getTeam: jest.fn(),
    getClubs: jest.fn().mockResolvedValue([]),
  };
  const processor = new CompetitionSyncEntryProcessor(
    { Code: "TOURN-2026" } as never,
    visualService as never,
    { transaction: undefined }
  );
  return { processor, visualService };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("CompetitionSyncEntryProcessor._updateTeamDataFromVisual", () => {
  let processor: CompetitionSyncEntryProcessor;
  let visualService: ReturnType<typeof makeProcessor>["visualService"];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ processor, visualService } = makeProcessor());
  });

  afterEach(() => jest.restoreAllMocks());

  // Helper to call the private method directly
  function callMethod(
    team: ReturnType<typeof makeTeam>,
    entry: ReturnType<typeof makeEntry>,
    drawId = 42
  ) {
    return (processor as unknown as Record<string, (...args: unknown[]) => unknown>)[
      "_updateTeamDataFromVisual"
    ](team, entry, drawId);
  }

  // ── Season guard ──────────────────────────────────────────────────────────

  describe("season guard — isBefore(today, Sep 1)", () => {
    it("calls _updateTeamDataFromVisual when current date is before Sep 1 of season", async () => {
      const updateSpy = jest
        .spyOn(processor as never, "_updateTeamDataFromVisual")
        .mockResolvedValue(undefined as never);

      // Minimal draw/subEvent/event mock so _processEntries can run
      const mockSubEvent = {
        eventType: "MX",
        getEventCompetition: jest.fn().mockResolvedValue({
          season: SEASON,
          state: "active",
          teamMatcher: "name",
          type: "G",
        }),
        getEventEntries: jest.fn().mockResolvedValue([]),
      };
      const mockDraw = {
        id: "draw-1",
        name: "Draw 1",
        getSubEventCompetition: jest.fn().mockResolvedValue(mockSubEvent),
        getEventEntries: jest.fn().mockResolvedValue([]),
        setEventEntries: jest.fn(),
      };

      // No teams in the XML draw → loop body is skipped — but the date check
      // happens inside the loop so we need at least one team to exercise it.
      // Use a minimal xmlDraw with one team and spy on _getTeam to return null
      // so the rest of the loop is skipped cleanly.
      visualService.getDraw.mockResolvedValue({ Structure: { Item: [{ Team: { Name: "T1" } }] } });
      visualService.getClubs.mockResolvedValue([]);
      jest.spyOn(processor as never, "_getTeam").mockResolvedValue(makeTeam() as never);

      // Find an entry for the team (otherwise EventEntry.new is called)
      const mockTeam = makeTeam();
      const mockEntry = {
        ...makeEntry(),
        setDrawCompetition: jest.fn().mockResolvedValue(undefined),
        setTeam: jest.fn().mockResolvedValue(undefined),
        teamId: mockTeam.id,
        team: mockTeam,
      };
      mockSubEvent.getEventEntries.mockResolvedValue([mockEntry]);
      mockDraw.getEventEntries.mockResolvedValue([mockEntry]);
      jest.spyOn(processor as never, "_getTeam").mockResolvedValue(mockTeam as never);

      (isBefore as jest.Mock).mockReturnValue(true); // before Sep 1

      processor.draws = [{ draw: mockDraw as never, internalId: 42 }];
      await processor.process();

      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it("does NOT call _updateTeamDataFromVisual on or after Sep 1 of season", async () => {
      const updateSpy = jest
        .spyOn(processor as never, "_updateTeamDataFromVisual")
        .mockResolvedValue(undefined as never);

      const mockSubEvent = {
        eventType: "MX",
        getEventCompetition: jest
          .fn()
          .mockResolvedValue({ season: SEASON, state: "active", teamMatcher: "name", type: "G" }),
        getEventEntries: jest.fn().mockResolvedValue([]),
      };
      const mockDraw = {
        id: "draw-1",
        name: "Draw 1",
        getSubEventCompetition: jest.fn().mockResolvedValue(mockSubEvent),
        getEventEntries: jest.fn().mockResolvedValue([]),
        setEventEntries: jest.fn(),
      };

      visualService.getDraw.mockResolvedValue({ Structure: { Item: [{ Team: { Name: "T1" } }] } });
      visualService.getClubs.mockResolvedValue([]);

      const mockTeam = makeTeam();
      const mockEntry = {
        ...makeEntry(),
        setDrawCompetition: jest.fn().mockResolvedValue(undefined),
        setTeam: jest.fn().mockResolvedValue(undefined),
        teamId: mockTeam.id,
        team: mockTeam,
      };
      mockSubEvent.getEventEntries.mockResolvedValue([mockEntry]);
      mockDraw.getEventEntries.mockResolvedValue([mockEntry]);
      jest.spyOn(processor as never, "_getTeam").mockResolvedValue(mockTeam as never);

      (isBefore as jest.Mock).mockReturnValue(false); // season already started

      processor.draws = [{ draw: mockDraw as never, internalId: 42 }];
      await processor.process();

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  // ── June 10 cutoff query ─────────────────────────────────────────────────

  describe("ranking cutoff — rankingDate <= June 10 of season", () => {
    it("queries Player.findAll with rankingDate [Op.lte] June 10 of the team's season", async () => {
      const team = makeTeam({ season: SEASON });
      const entry = makeEntry();

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "50098807", GenderID: 2 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([]);

      await callMethod(team, entry);

      expect(Player.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              where: expect.objectContaining({
                rankingDate: expect.objectContaining({
                  [Op.lte]: JUNE_10_CUTOFF,
                }),
              }),
            }),
          ]),
        })
      );
    });

    it("uses June 10 of the TEAM season, not the current year", async () => {
      const team = makeTeam({ season: 2025 });
      const entry = makeEntry();
      const expectedCutoff = new Date(2025, 5, 10);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "AAA", GenderID: 1 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([]);

      await callMethod(team, entry);

      expect(Player.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              where: expect.objectContaining({
                rankingDate: { [Op.lte]: expectedCutoff },
              }),
            }),
          ]),
        })
      );
    });
  });

  // ── Player levels: May snapshot (all disciplines set) ────────────────────

  describe("player with full May snapshot", () => {
    it("stores the correct levels from the May snapshot row", async () => {
      const team = makeTeam();
      const entry = makeEntry(); // no existing meta

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "50098807", GenderID: 2 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([
        makeDbPlayer({
          id: "player-uuid-1",
          memberId: "50098807",
          rankingPlaces: [{ single: 7, double: 5, mix: 7 }], // May 3 row
        }),
      ]);

      await callMethod(team, entry);

      const savedPlayers = entry.meta?.competition?.players;
      expect(savedPlayers).toHaveLength(1);
      expect(savedPlayers![0]).toMatchObject({ single: 7, double: 5, mix: 7, gender: "F" });
      expect(entry.save).toHaveBeenCalledWith(expect.objectContaining({ hooks: false }));
    });
  });

  // ── Shauni Goethals scenario: null single/mix after May ──────────────────

  describe("player inactive after May (null single/mix in June row)", () => {
    it("falls back to 12 when no existing meta and June row has null single/mix", async () => {
      // This matches the real Shauni Goethals data: May=7,5,7 but June 7 row=null,5,null.
      // Without existing meta the fallback is 12 (same as inactive default).
      const team = makeTeam();
      const entry = makeEntry(null); // no existing meta at all

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "50098807", GenderID: 2 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([
        makeDbPlayer({
          id: "player-uuid-1",
          memberId: "50098807",
          // June 7 row: inactive in single/mix
          rankingPlaces: [{ single: null, double: 5, mix: null }],
        }),
      ]);

      await callMethod(team, entry);

      const players = entry.meta?.competition?.players;
      expect(players![0]).toMatchObject({ single: 12, double: 5, mix: 12 });
    });

    it("preserves existing meta values (Jeroen's correction) when June row has nulls — bug regression", async () => {
      // The core bug: before the fix, _updateTeamDataFromVisual fetched rankingPlaces[0]
      // (most recent = July/August, null single/mix) and overwrote Jeroen's correction.
      // After the fix, existingPlayerMeta?.single takes precedence via ??.
      const team = makeTeam();
      const entry = makeEntry([
        {
          id: "player-uuid-1",
          single: 6, // Jeroen's corrected value (May was 7, Jeroen set 6)
          double: 5,
          mix: 5,
          gender: "F",
          levelException: false,
          levelExceptionRequested: false,
        },
      ]);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "50098807", GenderID: 2 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([
        makeDbPlayer({
          id: "player-uuid-1",
          memberId: "50098807",
          rankingPlaces: [{ single: null, double: 5, mix: null }], // June 7 row — would give 12,5,12
        }),
      ]);

      await callMethod(team, entry);

      const players = entry.meta?.competition?.players;
      // Jeroen's correction: single=6, mix=5 must survive the sync
      expect(players![0].single).toBe(6);
      expect(players![0].double).toBe(5);
      expect(players![0].mix).toBe(5);
    });

    it("uses ranking value for disciplines where existing meta is not set", async () => {
      // Player has existing meta for single (6) but NOT for double/mix.
      // double/mix should come from the ranking snapshot, not default to 12.
      const team = makeTeam();
      const entry = makeEntry([
        { id: "player-uuid-1", single: 6 }, // only single set in existing meta
      ]);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "50098807", GenderID: 2 }]));
      (Player.findAll as jest.Mock).mockResolvedValue([
        makeDbPlayer({
          id: "player-uuid-1",
          memberId: "50098807",
          rankingPlaces: [{ single: 7, double: 5, mix: 7 }], // May snapshot has all values
        }),
      ]);

      await callMethod(team, entry);

      const players = entry.meta?.competition?.players;
      expect(players![0].single).toBe(6); // existing meta takes precedence
      expect(players![0].double).toBe(5); // from ranking snapshot
      expect(players![0].mix).toBe(7); // from ranking snapshot (no existing meta for mix)
    });
  });

  // ── Multiple players ──────────────────────────────────────────────────────

  describe("multiple players with mixed situations", () => {
    it("handles each player independently — corrected + active + missing in same team", async () => {
      const team = makeTeam();
      const entry = makeEntry([
        // Player A: Jeroen's correction (single=6, mix=5)
        { id: "player-a", single: 6, double: 5, mix: 5, gender: "F" },
        // Player B: no existing meta
      ]);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(
        makeXmlTeam([
          { MemberID: "MEM-A", GenderID: 2 }, // F
          { MemberID: "MEM-B", GenderID: 1 }, // M
        ])
      );
      (Player.findAll as jest.Mock).mockResolvedValue([
        makeDbPlayer({
          id: "player-a",
          memberId: "MEM-A",
          rankingPlaces: [{ single: null, double: 5, mix: null }], // null after May
        }),
        makeDbPlayer({
          id: "player-b",
          memberId: "MEM-B",
          rankingPlaces: [{ single: 8, double: 7, mix: 9 }], // full May snapshot
        }),
      ]);

      await callMethod(team, entry);

      const players = entry.meta?.competition?.players;
      expect(players).toHaveLength(2);

      // Player A: existing meta preserved
      const playerA = players!.find((p) => p.id === "player-a");
      expect(playerA).toMatchObject({ single: 6, double: 5, mix: 5 });

      // Player B: from snapshot
      const playerB = players!.find((p) => p.id === "player-b");
      expect(playerB).toMatchObject({ single: 8, double: 7, mix: 9 });
    });
  });

  // ── Player not found in DB ────────────────────────────────────────────────

  it("assigns id=undefined and levels=12 when a Visual player has no matching DB record", async () => {
    const team = makeTeam();
    const entry = makeEntry();

    visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
    visualService.getTeam.mockResolvedValue(
      makeXmlTeam([{ MemberID: "UNKNOWN-MEMBER", GenderID: 2 }])
    );
    (Player.findAll as jest.Mock).mockResolvedValue([]); // no DB players found

    await callMethod(team, entry);

    const players = entry.meta?.competition?.players;
    expect(players).toHaveLength(1);
    expect(players![0]).toMatchObject({
      id: undefined,
      single: 12,
      double: 12,
      mix: 12,
      gender: "F",
    });
  });

  // ── Gender mapping ────────────────────────────────────────────────────────

  it('maps GenderID=1 to "M" and GenderID=2 to "F"', async () => {
    const team = makeTeam();
    const entry = makeEntry();

    visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
    visualService.getTeam.mockResolvedValue(
      makeXmlTeam([
        { MemberID: "M1", GenderID: 1 },
        { MemberID: "M2", GenderID: 2 },
      ])
    );
    (Player.findAll as jest.Mock).mockResolvedValue([
      makeDbPlayer({
        id: "p-m",
        memberId: "M1",
        rankingPlaces: [{ single: 5, double: 3, mix: 4 }],
      }),
      makeDbPlayer({
        id: "p-f",
        memberId: "M2",
        rankingPlaces: [{ single: 7, double: 5, mix: 7 }],
      }),
    ]);

    await callMethod(team, entry);

    const players = entry.meta?.competition?.players;
    expect(players!.find((p) => p.id === "p-m")?.gender).toBe("M");
    expect(players!.find((p) => p.id === "p-f")?.gender).toBe("F");
  });

  // ── levelException / levelExceptionReason preserved ──────────────────────

  it("carries levelException and levelExceptionReason from existing meta to output", async () => {
    const team = makeTeam();
    const entry = makeEntry([
      {
        id: "player-uuid-1",
        single: 3,
        double: 2,
        mix: 3,
        gender: "M",
        levelException: true,
        levelExceptionRequested: true,
        levelExceptionReason: "Tournament exemption 2026",
      },
    ]);

    visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
    visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "MEM-1", GenderID: 1 }]));
    (Player.findAll as jest.Mock).mockResolvedValue([
      makeDbPlayer({
        id: "player-uuid-1",
        memberId: "MEM-1",
        rankingPlaces: [{ single: 5, double: 3, mix: 4 }],
      }),
    ]);

    await callMethod(team, entry);

    const players = entry.meta?.competition?.players;
    expect(players![0]).toMatchObject({
      levelException: true,
      levelExceptionRequested: true,
      levelExceptionReason: "Tournament exemption 2026",
    });
  });

  // ── Visual API edge cases ────────────────────────────────────────────────

  describe("Visual API edge cases", () => {
    it("returns early without saving when getDraw returns null", async () => {
      const team = makeTeam();
      const entry = makeEntry();

      visualService.getDraw.mockResolvedValue(null);

      await callMethod(team, entry);

      expect(Player.findAll).not.toHaveBeenCalled();
      expect(entry.save).not.toHaveBeenCalled();
    });

    it("returns early without saving when draw has no Structure.Item", async () => {
      const team = makeTeam();
      const entry = makeEntry();

      visualService.getDraw.mockResolvedValue({ Structure: {} });

      await callMethod(team, entry);

      expect(entry.save).not.toHaveBeenCalled();
    });

    it("returns early without saving when team is not found in draw structure", async () => {
      const team = makeTeam({ name: "No Match Club 1G" });
      const entry = makeEntry();

      visualService.getDraw.mockResolvedValue(makeXmlDraw("Different Club 1G")); // name mismatch

      await callMethod(team, entry);

      expect(entry.save).not.toHaveBeenCalled();
    });

    it("keeps existing meta unchanged when xmlTeam has no Players", async () => {
      const existingMeta = [
        { id: "player-uuid-1", single: 7, double: 5, mix: 7, gender: "F" as const },
      ];
      const team = makeTeam();
      const entry = makeEntry(existingMeta);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue({ Players: undefined }); // no players in XML

      await callMethod(team, entry);

      // Entry not modified
      expect(entry.save).not.toHaveBeenCalled();
      expect(entry.meta?.competition?.players).toEqual(existingMeta);
    });

    it("keeps existing meta unchanged when xmlTeam.Players.Player is empty", async () => {
      const existingMeta = [{ id: "player-uuid-1", single: 7, double: 5, mix: 7 }];
      const team = makeTeam();
      const entry = makeEntry(existingMeta);

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([]));

      await callMethod(team, entry);

      expect(entry.save).not.toHaveBeenCalled();
    });

    it("returns early without error when team has no season set", async () => {
      const team = makeTeam({ season: undefined });
      const entry = makeEntry();

      visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
      visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "MEM-1", GenderID: 1 }]));

      await callMethod(team, entry); // must not throw

      expect(Player.findAll).not.toHaveBeenCalled();
      expect(entry.save).not.toHaveBeenCalled();
    });
  });

  // ── hooks: false ─────────────────────────────────────────────────────────

  it("always saves entry with hooks: false to bypass recalculateCompetitionIndex", async () => {
    const team = makeTeam();
    const entry = makeEntry();

    visualService.getDraw.mockResolvedValue(makeXmlDraw(team.name as string));
    visualService.getTeam.mockResolvedValue(makeXmlTeam([{ MemberID: "MEM-1", GenderID: 1 }]));
    (Player.findAll as jest.Mock).mockResolvedValue([
      makeDbPlayer({
        id: "p1",
        memberId: "MEM-1",
        rankingPlaces: [{ single: 5, double: 3, mix: 4 }],
      }),
    ]);

    await callMethod(team, entry);

    expect(entry.save).toHaveBeenCalledWith(expect.objectContaining({ hooks: false }));
  });
});
