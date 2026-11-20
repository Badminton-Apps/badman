import "reflect-metadata";
import { Model, ModelCtor, Sequelize } from "sequelize-typescript";
import * as sequelizeModels from "../models";
import { Player, RankingPlace, RankingSystem } from "../models";
import { findLatestRankingPlaces } from "./latest-ranking-places";

/**
 * Runs the lookup on in-memory SQLite (the dialect of the unit specs that load
 * DatabaseModule); the BAD-409 integration specs cover Postgres.
 *
 * Places are stored at midnight UTC, like the ranking sync writes them. `single`
 * tells which row came back.
 */
describe("findLatestRankingPlaces", () => {
  let sequelize: Sequelize;
  let systemA: RankingSystem;
  let systemB: RankingSystem;
  let player: Player;
  let other: Player;
  let empty: Player;

  const place = (
    playerId: string,
    systemId: string,
    date: string,
    single: number,
    updatePossible = true
  ) =>
    RankingPlace.create(
      {
        playerId,
        systemId,
        rankingDate: new Date(date.includes("T") ? date : `${date}T00:00:00.000Z`),
        single,
        double: single,
        mix: single,
        updatePossible,
      },
      { hooks: false }
    );

  const singles = (map: Map<string, { single: number | null }>) =>
    Object.fromEntries([...map].map(([id, p]) => [id, p.single]));

  beforeAll(async () => {
    const models = Object.values(sequelizeModels).filter(
      (m) => typeof m === "function" && m.prototype instanceof Model
    ) as ModelCtor[];
    sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false, models });
    await sequelize.sync({ force: true });

    [systemA, systemB] = await Promise.all(
      ["A", "B"].map((name) => RankingSystem.create({ name: `system ${name}` }, { hooks: false }))
    );
    [player, other, empty] = await Promise.all(
      ["player", "other", "empty"].map((firstName) =>
        Player.create({ firstName, lastName: "test", memberId: firstName }, { hooks: false })
      )
    );

    await place(player.id, systemA.id, "2026-05-04", 10);
    await place(player.id, systemA.id, "2026-05-25", 9, false);
    await place(player.id, systemA.id, "2026-06-01", 8);
    await place(player.id, systemA.id, "2026-06-08", 7, false);
    await place(player.id, systemA.id, "2026-06-10", 6);
    await place(player.id, systemA.id, "2026-06-11", 5);
    await place(player.id, systemB.id, "2026-06-09", 3);
    await place(other.id, systemA.id, "2026-06-02", 4);
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it("returns the newest place on or before the date, the date itself included", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id],
      systemId: systemA.id,
      onOrBefore: "2026-06-10",
    });
    expect(singles(result)).toEqual({ [player.id]: 6 });
  });

  it("excludes the day after", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id],
      systemId: systemA.id,
      onOrBefore: "2026-06-09",
    });
    expect(singles(result)).toEqual({ [player.id]: 7 });
  });

  it("filters on the ranking system", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id],
      systemId: systemB.id,
      onOrBefore: "2026-06-10",
    });
    expect(singles(result)).toEqual({ [player.id]: 3 });
  });

  it("only takes update publications when asked", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id],
      systemId: systemA.id,
      onOrBefore: "2026-06-09",
      updatePossibleOnly: true,
    });
    expect(singles(result)).toEqual({ [player.id]: 8 });
  });

  it("applies the lower bound of a window, both ends included", async () => {
    const may = await findLatestRankingPlaces({
      playerIds: [player.id, other.id],
      systemId: systemA.id,
      onOrAfter: "2026-05-01",
      onOrBefore: "2026-05-31",
      updatePossibleOnly: true,
    });
    expect(singles(may)).toEqual({ [player.id]: 10 });

    const firstWeekOfJune = await findLatestRankingPlaces({
      playerIds: [player.id, other.id],
      systemId: systemA.id,
      onOrAfter: "2026-06-02",
      onOrBefore: "2026-06-07",
    });
    expect(singles(firstWeekOfJune)).toEqual({ [other.id]: 4 });
  });

  it("matches a place stored at midnight Brussels of the same date", async () => {
    const brussels = await Player.create(
      { firstName: "brussels", lastName: "test", memberId: "brussels" },
      { hooks: false }
    );
    await place(brussels.id, systemA.id, "2026-06-09T22:00:00.000Z", 2);

    const onTheDay = await findLatestRankingPlaces({
      playerIds: [brussels.id],
      systemId: systemA.id,
      onOrAfter: "2026-06-10",
      onOrBefore: "2026-06-10",
    });
    expect(singles(onTheDay)).toEqual({ [brussels.id]: 2 });
  });

  it("returns several players in one call and leaves out players without a place", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id, other.id, empty.id],
      systemId: systemA.id,
      onOrBefore: "2026-06-10",
    });
    expect(singles(result)).toEqual({ [player.id]: 6, [other.id]: 4 });
  });

  it("returns the row's fields as typed values", async () => {
    const result = await findLatestRankingPlaces({
      playerIds: [player.id],
      systemId: systemA.id,
      onOrBefore: "2026-06-10",
    });
    const latest = result.get(player.id);

    expect(latest).toEqual({
      id: expect.any(String),
      playerId: player.id,
      rankingDate: new Date("2026-06-10T00:00:00.000Z"),
      single: 6,
      double: 6,
      mix: 6,
      updatePossible: true,
    });
  });

  it("returns an empty map without a query for no players", async () => {
    const query = jest.spyOn(sequelize, "query");
    const result = await findLatestRankingPlaces({
      playerIds: [],
      systemId: systemA.id,
      onOrBefore: "2026-06-10",
    });

    expect(result.size).toBe(0);
    expect(query).not.toHaveBeenCalled();
    query.mockRestore();
  });
});
