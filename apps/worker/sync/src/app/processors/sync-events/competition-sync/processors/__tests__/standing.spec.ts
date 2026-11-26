import { Game, Standing } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { Transaction } from "sequelize";
import { CompetitionSyncStandingProcessor } from "../standing";

// Real Standing instance (real restartCount) without needing a Sequelize connection
function makeStanding(id: string) {
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
  return standing;
}

function makeTeam(id: string) {
  const standing = makeStanding(`standing-${id}`);
  const entry = {
    id: `entry-${id}`,
    save: jest.fn().mockResolvedValue(undefined),
    getStanding: jest.fn().mockResolvedValue(standing),
  };
  return { team: { id, entry }, standing };
}

const dbGame = (encounterId: string) =>
  ({
    linkId: encounterId,
    linkType: "competition",
    winner: 1,
    set1Team1: 21,
    set1Team2: 10,
    set2Team1: 21,
    set2Team2: 10,
  }) as unknown as Game;

describe("CompetitionSyncStandingProcessor", () => {
  afterEach(() => jest.restoreAllMocks());

  it("counts games of every played encounter, not only those synced in this run", async () => {
    const a = makeTeam("A");
    const b = makeTeam("B");
    const c = makeTeam("C");

    const encounter = (
      id: string,
      home: ReturnType<typeof makeTeam>,
      away: ReturnType<typeof makeTeam>
    ) => ({
      id,
      drawId: "draw-1",
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      homeScore: 5,
      awayScore: 3,
      getHome: jest.fn().mockResolvedValue(home.team),
      getAway: jest.fn().mockResolvedValue(away.team),
    });

    // e1 is an old, finished encounter: the game step skips it, so its games are
    // not part of this run's output. e2 was (re)synced in this run.
    const e1 = encounter("e1", a, b);
    const e2 = encounter("e2", a, c);

    // Both encounters have their games stored in the DB
    jest.spyOn(Game, "findAll").mockResolvedValue([dbGame("e1"), dbGame("e2")]);

    const processor = new CompetitionSyncStandingProcessor({
      transaction: {} as Transaction,
      logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger,
    });
    processor.draws = [{ draw: { id: "draw-1", subeventId: "sub-1" } }] as never;
    processor.encounters = [{ encounter: e1 }, { encounter: e2 }] as never;
    processor.games = [dbGame("e2")];
    jest.spyOn(Standing, "bulkCreate").mockResolvedValue([]);

    await processor.process();

    // points / won come from encounter scores: A won both encounters
    expect(a.standing.won).toBe(2);
    expect(a.standing.points).toBe(4);

    // games / sets must agree: A won 1 game in each encounter
    expect(a.standing.gamesWon).toBe(2);
    expect(a.standing.setsWon).toBe(4);
    expect(a.standing.totalPointsWon).toBe(84);
    // B only played e1 and was beaten there
    expect(b.standing.gamesLost).toBe(1);
  });
});
