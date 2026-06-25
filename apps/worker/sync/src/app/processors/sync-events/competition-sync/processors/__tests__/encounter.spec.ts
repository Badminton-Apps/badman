import { EncounterCompetition, Game } from "@badman/backend-database";
import { VisualService, XmlTournament } from "@badman/backend-visual";
import { CompetitionSyncEncounterProcessor } from "../encounter";

jest.mock("@badman/backend-database", () => ({
  EncounterCompetition: jest.fn(),
  Game: {
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("sequelize", () => ({
  Op: { in: Symbol("in"), ne: Symbol("ne"), and: Symbol("and"), or: Symbol("or") },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function makeDbEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: `enc-${Math.random()}`,
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    drawId: "draw-1",
    visualCode: null as string | null,
    date: null as Date | null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeXmlTeamMatch(
  code: string,
  team1Name = "Team A",
  team2Name = "Team B",
  matchTime: string | null = null
) {
  return {
    Code: code,
    MatchTime: matchTime,
    Team1: { Name: team1Name },
    Team2: { Name: team2Name },
    Sets: undefined,
  };
}

function makeDraw(encounters: ReturnType<typeof makeDbEncounter>[]) {
  return {
    id: "draw-1",
    getEncounterCompetitions: jest.fn().mockResolvedValue(encounters),
  };
}

function makeProcessor(visualService: { getGames: jest.Mock }, transaction = {} as never) {
  const tournament = { Code: "TOURN-1" } as XmlTournament;
  const processor = new CompetitionSyncEncounterProcessor(
    tournament,
    visualService as unknown as VisualService,
    { transaction }
  );

  processor.event = { season: 2025 } as never;
  processor.entries = [
    { xmlTeamName: "Team A", entry: { team: { id: "team-a" } } },
    { xmlTeamName: "Team B", entry: { team: { id: "team-b" } } },
    { xmlTeamName: "Team C", entry: { team: { id: "team-c" } } },
  ] as never;

  return processor;
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("CompetitionSyncEncounterProcessor — 3x/4x format", () => {
  let visualService: { getGames: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    visualService = { getGames: jest.fn() };

    // Default: no scored games → safe to destroy
    (Game.findAll as jest.Mock).mockResolvedValue([]);
    (Game.destroy as jest.Mock).mockResolvedValue(undefined);

    // EncounterCompetition constructor → returns a saveable object
    (EncounterCompetition as unknown as jest.Mock).mockImplementation(
      (data: Record<string, unknown>) => ({
        ...data,
        id: `new-enc-${Math.random()}`,
        save: jest.fn().mockReturnThis(),
      })
    );

    // EncounterCompetition.destroy
    (EncounterCompetition as unknown as jest.Mock & { destroy?: jest.Mock }).destroy = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("creates one encounter per TeamMatch in a standard 2x draw (baseline)", async () => {
    const dbEncounters = [makeDbEncounter(), makeDbEncounter()];
    const draw = makeDraw(dbEncounters);

    visualService.getGames.mockResolvedValue([makeXmlTeamMatch("1"), makeXmlTeamMatch("2")]);

    const processor = makeProcessor(visualService);
    processor.draws = [{ draw: draw as never, internalId: 10 }];

    const result = await processor.process();

    expect(result).toHaveLength(2);
  });

  it("produces one DB row per TeamMatch in a 3x draw — original bug reproducer", async () => {
    // DB has 2 pre-created encounters for team-a vs team-b (planned as 2x)
    // Toornoi now says there are 3 matches for that pair
    const dbEncounters = [makeDbEncounter(), makeDbEncounter()];
    const draw = makeDraw(dbEncounters);

    visualService.getGames.mockResolvedValue([
      makeXmlTeamMatch("1"), // team-a vs team-b, 1st time
      makeXmlTeamMatch("2"), // team-a vs team-b, 2nd time
      makeXmlTeamMatch("3"), // team-a vs team-b, 3rd time
    ]);

    const processor = makeProcessor(visualService);
    processor.draws = [{ draw: draw as never, internalId: 10 }];

    const result = await processor.process();

    // Each of the 3 toornoi matches must produce a distinct encounter row
    expect(result).toHaveLength(3);
    const ids = result.map((r) => r.encounter.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("produces 12 distinct encounter rows matching real Dendermondse 1D data", async () => {
    // Real data from PBO 2025-2026, ladies 1st provincial.
    // 4 opponents, each played 3x. Home/away rotates — two rounds share the
    // same home/away direction for the same pair, which is exactly what
    // triggers the collapse bug in the original find().
    //
    // DB has 8 pre-created encounters (2x planning: one each direction per pair).
    const dbEncounters = [
      makeDbEncounter({ id: "enc-dend-geraar-home", homeTeamId: "dend", awayTeamId: "geraar" }),
      makeDbEncounter({ id: "enc-geraar-dend-home", homeTeamId: "geraar", awayTeamId: "dend" }),
      makeDbEncounter({ id: "enc-dend-ghent-home", homeTeamId: "dend", awayTeamId: "ghent" }),
      makeDbEncounter({ id: "enc-ghent-dend-home", homeTeamId: "ghent", awayTeamId: "dend" }),
      makeDbEncounter({ id: "enc-dend-lok2-home", homeTeamId: "dend", awayTeamId: "lok2" }),
      makeDbEncounter({ id: "enc-lok2-dend-home", homeTeamId: "lok2", awayTeamId: "dend" }),
      makeDbEncounter({ id: "enc-dend-lok3-home", homeTeamId: "dend", awayTeamId: "lok3" }),
      makeDbEncounter({ id: "enc-lok3-dend-home", homeTeamId: "lok3", awayTeamId: "dend" }),
    ];

    const draw = makeDraw(dbEncounters);

    // 12 toornoi matches — home/away mirrors the real schedule.
    // Rounds r07, r11, r13, r14 repeat the same home/away direction as an
    // earlier match for that pair → these are the 4 the bug collapses.
    const xmlMatches = [
      makeXmlTeamMatch("r01", "Dendermondse", "Geraardsbergen"), // round 1  — Dend home
      makeXmlTeamMatch("r02", "4Ghent", "Dendermondse"), // round 2  — 4Ghent home
      makeXmlTeamMatch("r03", "Dendermondse", "Lokerse2"), // round 3  — Dend home
      makeXmlTeamMatch("r04", "Lokerse3", "Dendermondse"), // round 4  — Lok3 home
      makeXmlTeamMatch("r06", "Geraardsbergen", "Dendermondse"), // round 6  — Geraar home
      makeXmlTeamMatch("r07", "4Ghent", "Dendermondse"), // round 7  — 4Ghent home AGAIN ← collision
      makeXmlTeamMatch("r08", "Lokerse2", "Dendermondse"), // round 8  — Lok2 home
      makeXmlTeamMatch("r09", "Dendermondse", "Lokerse3"), // round 9  — Dend home
      makeXmlTeamMatch("r11", "Dendermondse", "Geraardsbergen"), // round 11 — Dend home AGAIN ← collision
      makeXmlTeamMatch("r12", "Dendermondse", "4Ghent"), // round 12 — Dend home
      makeXmlTeamMatch("r13", "Lokerse2", "Dendermondse"), // round 13 — Lok2 home AGAIN ← collision
      makeXmlTeamMatch("r14", "Dendermondse", "Lokerse3"), // round 14 — Dend home AGAIN ← collision
    ];

    visualService.getGames.mockResolvedValue(xmlMatches);

    const processor = makeProcessor(visualService);
    processor.entries = [
      { xmlTeamName: "Dendermondse", entry: { team: { id: "dend" } } },
      { xmlTeamName: "Geraardsbergen", entry: { team: { id: "geraar" } } },
      { xmlTeamName: "4Ghent", entry: { team: { id: "ghent" } } },
      { xmlTeamName: "Lokerse2", entry: { team: { id: "lok2" } } },
      { xmlTeamName: "Lokerse3", entry: { team: { id: "lok3" } } },
    ] as never;
    processor.draws = [{ draw: draw as never, internalId: 10 }];

    const result = await processor.process();

    // All 12 toornoi matches must produce 12 distinct encounter rows.
    expect(result).toHaveLength(12);
    const ids = result.map((r) => r.encounter.id);
    expect(new Set(ids).size).toBe(12);
  });
});
