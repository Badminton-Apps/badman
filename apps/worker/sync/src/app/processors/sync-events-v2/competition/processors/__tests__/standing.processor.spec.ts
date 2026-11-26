import { DrawCompetition, Standing } from "@badman/backend-database";
import { TransactionManager } from "@badman/backend-queue";
import { Job } from "bull";
import { DrawStandingCompetitionProcessor } from "../standing.processor";

type MockStanding = Standing & { restartCount: jest.SpyInstance };

// Real Standing instance (real restartCount) without needing a Sequelize connection
function makeStanding(id: string): MockStanding {
  const standing = Object.create(Standing.prototype) as Standing;
  Object.assign(standing, {
    id,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    setsWon: 0,
    setsLost: 0,
    totalPointsWon: 0,
    totalPointsLost: 0,
    toJSON: () => ({ ...standing }),
  });
  jest.spyOn(standing, "restartCount");
  return standing as MockStanding;
}

function makeTeam(id: string) {
  const standing = makeStanding(`standing-${id}`);
  const entry = {
    id: `entry-${id}`,
    save: jest.fn().mockResolvedValue(undefined),
    getStanding: jest.fn().mockResolvedValue(standing),
  };
  return { team: { id, entry }, standing, entry };
}

describe("DrawStandingCompetitionProcessor", () => {
  let processor: DrawStandingCompetitionProcessor;
  const transaction = { id: "trx" };
  const transactionManager = {
    getTransaction: jest.fn().mockResolvedValue(transaction),
  } as unknown as TransactionManager;

  const job = (drawId = "draw-1") =>
    ({
      data: { transactionId: "t1", drawId, gameJobIds: [], options: {} },
    }) as unknown as Job<never>;

  beforeEach(() => {
    processor = new DrawStandingCompetitionProcessor(transactionManager);
  });

  afterEach(() => jest.restoreAllMocks());

  it("does nothing when the draw has no encounters", async () => {
    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      encounterCompetitions: [],
    } as unknown as DrawCompetition);
    const bulk = jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect(bulk).not.toHaveBeenCalled();
  });

  it("computes standings, positions and risers/fallers", async () => {
    const home = makeTeam("home");
    const away = makeTeam("away");

    const encounter = {
      id: "e1",
      homeTeamId: "home",
      awayTeamId: "away",
      homeScore: 6,
      awayScore: 2,
      getHome: jest.fn().mockResolvedValue(home.team),
      getAway: jest.fn().mockResolvedValue(away.team),
      getGames: jest.fn().mockResolvedValue([
        { winner: 1, set1Team1: 21, set1Team2: 10, set2Team1: 21, set2Team2: 15 },
        {
          winner: 2,
          set1Team1: 10,
          set1Team2: 21,
          set2Team1: 21,
          set2Team2: 18,
          set3Team1: 15,
          set3Team2: 21,
        },
      ]),
    };

    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      id: "draw-1",
      subeventId: "sub-1",
      risers: 1,
      fallers: 1,
      encounterCompetitions: [encounter],
    } as unknown as DrawCompetition);
    const bulk = jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect(home.standing.played).toBe(1);
    expect(home.standing.won).toBe(1);
    expect(home.standing.points).toBe(2);
    expect(away.standing.lost).toBe(1);
    expect(away.standing.points).toBe(0);
    expect(home.standing.gamesWon).toBe(1);
    expect(home.standing.gamesLost).toBe(1);
    expect(home.standing.setsWon).toBe(3);
    expect(home.standing.setsLost).toBe(2);

    expect(home.standing.position).toBe(1);
    expect(home.standing.riser).toBe(true);
    expect(away.standing.position).toBe(2);
    expect(away.standing.faller).toBe(true);

    expect(bulk).toHaveBeenCalledTimes(1);
    expect(bulk.mock.calls[0][0]).toHaveLength(2);
    expect(bulk.mock.calls[0][1]).toMatchObject({ transaction });
  });

  it("ranks teams by points (A: 4pts, B: 2pts, C: 0pts)", async () => {
    const a = makeTeam("A");
    const b = makeTeam("B");
    const c = makeTeam("C");

    const encounter = (
      id: string,
      home: ReturnType<typeof makeTeam>,
      away: ReturnType<typeof makeTeam>,
      homeScore: number,
      awayScore: number
    ) => ({
      id,
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      homeScore,
      awayScore,
      getHome: jest.fn().mockResolvedValue(home.team),
      getAway: jest.fn().mockResolvedValue(away.team),
      getGames: jest.fn().mockResolvedValue([]),
    });

    // Worst team (C) shows up first so insertion order is the opposite of the real ranking
    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      id: "draw-1",
      subeventId: "sub-1",
      risers: 1,
      fallers: 1,
      encounterCompetitions: [
        encounter("e1", c, b, 3, 5), // B beats C
        encounter("e2", b, a, 3, 5), // A beats B
        encounter("e3", a, c, 6, 2), // A beats C
      ],
    } as unknown as DrawCompetition);
    jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect([a.standing.points, b.standing.points, c.standing.points]).toEqual([4, 2, 0]);

    const ranking = [a, b, c]
      .map(({ team, standing }) => ({ team: team.id, position: standing.position }))
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
    expect(ranking).toEqual([
      { team: "A", position: 1 },
      { team: "B", position: 2 },
      { team: "C", position: 3 },
    ]);
    expect(a.standing.riser).toBe(true);
    expect(c.standing.faller).toBe(true);
  });

  it("awards one point each for a tie", async () => {
    const home = makeTeam("home");
    const away = makeTeam("away");
    const encounter = {
      id: "e1",
      homeTeamId: "home",
      awayTeamId: "away",
      homeScore: 4,
      awayScore: 4,
      getHome: jest.fn().mockResolvedValue(home.team),
      getAway: jest.fn().mockResolvedValue(away.team),
      getGames: jest.fn().mockResolvedValue([]),
    };
    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      id: "draw-1",
      subeventId: "sub-1",
      encounterCompetitions: [encounter],
    } as unknown as DrawCompetition);
    jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect(home.standing.tied).toBe(1);
    expect(away.standing.tied).toBe(1);
    expect(home.standing.points).toBe(1);
    expect(away.standing.points).toBe(1);
  });

  it("skips unplayed encounters but still persists standings", async () => {
    const home = makeTeam("home");
    const away = makeTeam("away");
    const encounter = {
      id: "e1",
      homeTeamId: "home",
      awayTeamId: "away",
      homeScore: 0,
      awayScore: 0,
      getHome: jest.fn().mockResolvedValue(home.team),
      getAway: jest.fn().mockResolvedValue(away.team),
      getGames: jest.fn(),
    };
    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      id: "draw-1",
      subeventId: "sub-1",
      encounterCompetitions: [encounter],
    } as unknown as DrawCompetition);
    const bulk = jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect(encounter.getGames).not.toHaveBeenCalled();
    expect(home.standing.played).toBe(0);
    expect(home.standing.restartCount).toHaveBeenCalled();
    expect(bulk).toHaveBeenCalledTimes(1);
  });

  it("ignores encounters without both teams", async () => {
    const encounter = {
      id: "e1",
      homeTeamId: "home",
      awayTeamId: null,
      homeScore: 5,
      awayScore: 3,
      getHome: jest.fn(),
      getAway: jest.fn(),
      getGames: jest.fn(),
    };
    jest.spyOn(DrawCompetition, "findOne").mockResolvedValue({
      id: "draw-1",
      subeventId: "sub-1",
      encounterCompetitions: [encounter],
    } as unknown as DrawCompetition);
    const bulk = jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.ProcessSyncCompetitionDrawStanding(job());

    expect(encounter.getHome).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });
});
