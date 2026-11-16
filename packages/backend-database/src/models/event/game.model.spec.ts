import "reflect-metadata";
import { LoggingAction } from "@badman/utils";
import { Transaction } from "sequelize";
import { Logging } from "../system/logging.model";
import { GamePlayerMembership } from "./game-player.model";
import { Game } from "./game.model";

const transaction = { id: "tx" } as unknown as Transaction;

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    linkId: "enc-1",
    linkType: "competition",
    order: 3,
    gameType: "S",
    status: "NORMAL",
    winner: 1,
    set1Team1: 21,
    set1Team2: 18,
    set2Team1: 21,
    set2Team2: 15,
    set3Team1: null,
    set3Team2: null,
    visualCode: "7",
    playedAt: new Date("2026-03-01T15:00:00Z"),
    ...overrides,
  } as unknown as Game;
}

describe("Game delete log", () => {
  let bulkCreateSpy: jest.SpyInstance;
  let membershipSpy: jest.SpyInstance;

  beforeEach(() => {
    bulkCreateSpy = jest.spyOn(Logging, "bulkCreate").mockResolvedValue([]);
    membershipSpy = jest.spyOn(GamePlayerMembership, "findAll").mockResolvedValue([
      { gameId: "game-1", playerId: "p-home", team: 1, player: 1 },
      { gameId: "game-1", playerId: "p-away", team: 2, player: 1 },
    ] as unknown as GamePlayerMembership[]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("logs a deleted competition game with its result and players in the same transaction", async () => {
    await Game.gameDestroyed(makeGame(), { transaction });

    expect(membershipSpy).toHaveBeenCalledWith({ where: { gameId: ["game-1"] }, transaction });
    expect(bulkCreateSpy).toHaveBeenCalledWith(
      [
        {
          action: LoggingAction.GameDeleted,
          meta: {
            gameId: "game-1",
            linkId: "enc-1",
            linkType: "competition",
            order: 3,
            gameType: "S",
            status: "NORMAL",
            winner: 1,
            sets: [
              [21, 18],
              [21, 15],
              [null, null],
            ],
            visualCode: "7",
            playedAt: new Date("2026-03-01T15:00:00Z"),
            players: [
              { playerId: "p-home", team: 1, player: 1 },
              { playerId: "p-away", team: 2, player: 1 },
            ],
          },
        },
      ],
      { transaction }
    );
  });

  it("does not log a deleted tournament game", async () => {
    await Game.gameDestroyed(makeGame({ linkType: "tournament" }), { transaction });

    expect(membershipSpy).not.toHaveBeenCalled();
    expect(bulkCreateSpy).not.toHaveBeenCalled();
  });

  it("logs every competition game a bulk delete is about to remove", async () => {
    const where = { linkId: "enc-1" };
    const findAllSpy = jest
      .spyOn(Game, "findAll")
      .mockResolvedValue([
        makeGame(),
        makeGame({ id: "game-2", order: 4 }),
        makeGame({ id: "game-3", linkType: "tournament" }),
      ]);

    await Game.gamesDestroyed({ where, transaction });

    expect(findAllSpy).toHaveBeenCalledWith({ where, transaction });
    expect(membershipSpy).toHaveBeenCalledWith({
      where: { gameId: ["game-1", "game-2"] },
      transaction,
    });
    const [rows] = bulkCreateSpy.mock.calls[0];
    expect(rows.map((row: { meta: { gameId: string } }) => row.meta.gameId)).toEqual([
      "game-1",
      "game-2",
    ]);
    expect(rows[1].meta.players).toEqual([]);
  });

  it("does not log when a bulk delete matches no games", async () => {
    jest.spyOn(Game, "findAll").mockResolvedValue([]);

    await Game.gamesDestroyed({ where: { linkId: "enc-1" }, transaction });

    expect(bulkCreateSpy).not.toHaveBeenCalled();
  });

  it("leaves a bulk delete with individual hooks to the per-game hook", async () => {
    const findAllSpy = jest.spyOn(Game, "findAll");

    await Game.gamesDestroyed({ where: { linkId: "enc-1" }, individualHooks: true, transaction });

    expect(findAllSpy).not.toHaveBeenCalled();
    expect(bulkCreateSpy).not.toHaveBeenCalled();
  });
});
