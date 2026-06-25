import { EncounterCompetition, Game } from "@badman/backend-database";
import { VisualService, XmlTournament } from "@badman/backend-visual";
import { fromZonedTime } from "date-fns-tz";
import { CompetitionSyncEncounterProcessor } from "../encounter";

/** Convert a Brussels local time string to the UTC Date the processor produces. */
function bd(isoLocal: string): Date {
  return fromZonedTime(isoLocal, "Europe/Brussels");
}

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
    // Each match has a unique MatchTime so the date-based matching path is
    // exercised (matchDate != null branch). The DB encounter dates are
    // pre-populated to match, using the same fromZonedTime conversion the
    // processor applies. Rounds r07, r11, r13, r14 share the same home/away
    // direction as an earlier round — their distinct dates are what prevents
    // the collision.
    //
    // DB has 8 pre-created encounters (2x planning: one each direction per pair).
    // For pairs that play 3x, one DB row carries the date of the first encounter;
    // the second and third encounters will be created fresh by the processor.
    const dbEncounters = [
      makeDbEncounter({
        id: "enc-dend-geraar-home",
        homeTeamId: "dend",
        awayTeamId: "geraar",
        date: bd("2025-10-05T14:00:00"),
      }), // r01
      makeDbEncounter({
        id: "enc-geraar-dend-home",
        homeTeamId: "geraar",
        awayTeamId: "dend",
        date: bd("2025-10-12T14:00:00"),
      }), // r06
      makeDbEncounter({
        id: "enc-dend-ghent-home",
        homeTeamId: "dend",
        awayTeamId: "ghent",
        date: null,
      }),
      makeDbEncounter({
        id: "enc-ghent-dend-home",
        homeTeamId: "ghent",
        awayTeamId: "dend",
        date: bd("2025-10-12T16:00:00"),
      }), // r02
      makeDbEncounter({
        id: "enc-dend-lok2-home",
        homeTeamId: "dend",
        awayTeamId: "lok2",
        date: bd("2025-10-19T14:00:00"),
      }), // r03
      makeDbEncounter({
        id: "enc-lok2-dend-home",
        homeTeamId: "lok2",
        awayTeamId: "dend",
        date: bd("2025-11-02T14:00:00"),
      }), // r08
      makeDbEncounter({
        id: "enc-dend-lok3-home",
        homeTeamId: "dend",
        awayTeamId: "lok3",
        date: bd("2025-11-09T14:00:00"),
      }), // r09
      makeDbEncounter({
        id: "enc-lok3-dend-home",
        homeTeamId: "lok3",
        awayTeamId: "dend",
        date: bd("2025-10-26T14:00:00"),
      }), // r04
    ];

    const draw = makeDraw(dbEncounters);

    // 12 toornoi matches — home/away mirrors the real schedule.
    // Rounds r07, r11, r13, r14 repeat the same home/away direction as an
    // earlier match for that pair but carry different MatchTimes → the
    // date-based lookup correctly treats them as new encounters.
    const xmlMatches = [
      makeXmlTeamMatch("r01", "Dendermondse", "Geraardsbergen", "2025-10-05T14:00:00"), // Dend home
      makeXmlTeamMatch("r02", "4Ghent", "Dendermondse", "2025-10-12T16:00:00"), // 4Ghent home
      makeXmlTeamMatch("r03", "Dendermondse", "Lokerse2", "2025-10-19T14:00:00"), // Dend home
      makeXmlTeamMatch("r04", "Lokerse3", "Dendermondse", "2025-10-26T14:00:00"), // Lok3 home
      makeXmlTeamMatch("r06", "Geraardsbergen", "Dendermondse", "2025-10-12T14:00:00"), // Geraar home
      makeXmlTeamMatch("r07", "4Ghent", "Dendermondse", "2025-11-16T16:00:00"), // 4Ghent home AGAIN ← was collision
      makeXmlTeamMatch("r08", "Lokerse2", "Dendermondse", "2025-11-02T14:00:00"), // Lok2 home
      makeXmlTeamMatch("r09", "Dendermondse", "Lokerse3", "2025-11-09T14:00:00"), // Dend home
      makeXmlTeamMatch("r11", "Dendermondse", "Geraardsbergen", "2025-11-23T14:00:00"), // Dend home AGAIN ← was collision
      makeXmlTeamMatch("r12", "Dendermondse", "4Ghent", "2025-11-30T14:00:00"), // Dend home
      makeXmlTeamMatch("r13", "Lokerse2", "Dendermondse", "2025-12-07T14:00:00"), // Lok2 home AGAIN ← was collision
      makeXmlTeamMatch("r14", "Dendermondse", "Lokerse3", "2025-12-14T14:00:00"), // Dend home AGAIN ← was collision
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
