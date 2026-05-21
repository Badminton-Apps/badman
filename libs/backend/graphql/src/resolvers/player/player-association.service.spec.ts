import { Player, RankingLastPlace, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { Op } from "sequelize";
import { PlayerAssociationService } from "./player-association.service";

type SystemServiceMock = Pick<RankingSystemService, "getPrimary"> & { getPrimary: jest.Mock };

const PRIMARY = { id: "primary-1" } as RankingSystem;

describe("PlayerAssociationService — request-scoped batching", () => {
  let service: PlayerAssociationService;
  let rankingSystemService: SystemServiceMock;

  beforeEach(() => {
    rankingSystemService = {
      getPrimary: jest.fn().mockResolvedValue(PRIMARY),
    };
    service = new PlayerAssociationService(rankingSystemService as unknown as RankingSystemService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("getPrimaryRankingLastPlaces: batches playerIds across players into one findAll, grouped by playerId", async () => {
    const findAll = jest
      .spyOn(RankingLastPlace, "findAll")
      .mockResolvedValue([
        { playerId: "p1", systemId: PRIMARY.id, id: "rl1" } as RankingLastPlace,
        { playerId: "p1", systemId: PRIMARY.id, id: "rl2" } as RankingLastPlace,
        { playerId: "p2", systemId: PRIMARY.id, id: "rl3" } as RankingLastPlace,
      ]);

    const players = [
      { id: "p1" } as Player,
      { id: "p2" } as Player,
      { id: "p1" } as Player, // duplicate id — dataloader dedups
    ];

    const results = await Promise.all(players.map((p) => service.getPrimaryRankingLastPlaces(p)));

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(results[0].map((r) => r.id)).toEqual(["rl1", "rl2"]);
    expect(results[1].map((r) => r.id)).toEqual(["rl3"]);
    expect(results[2].map((r) => r.id)).toEqual(["rl1", "rl2"]);
    expect(rankingSystemService.getPrimary).toHaveBeenCalledTimes(1);
  });

  it("getPrimaryRankingLastPlaces: returns [] for every key when primary system is missing without querying", async () => {
    rankingSystemService.getPrimary.mockResolvedValue(null);
    const findAll = jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);

    const results = await Promise.all([
      service.getPrimaryRankingLastPlaces({ id: "p1" } as Player),
      service.getPrimaryRankingLastPlaces({ id: "p2" } as Player),
    ]);

    expect(findAll).not.toHaveBeenCalled();
    expect(results).toEqual([[], []]);
  });

  it("getPrimaryRankingLastPlaces: dedupes the same playerId requested twice in the same tick", async () => {
    const findAll = jest
      .spyOn(RankingLastPlace, "findAll")
      .mockResolvedValue([{ playerId: "p1", systemId: PRIMARY.id, id: "rl1" } as RankingLastPlace]);

    const [a, b] = await Promise.all([
      service.getPrimaryRankingLastPlaces({ id: "p1" } as Player),
      service.getPrimaryRankingLastPlaces({ id: "p1" } as Player),
    ]);

    expect(findAll).toHaveBeenCalledTimes(1);
    const where = (findAll.mock.calls[0][0] as { where: { playerId: Record<symbol, string[]> } })
      .where;
    expect(where.playerId[Op.in as unknown as symbol]).toEqual(["p1"]);
    expect(a).toEqual(b);
  });

  it("getPrimaryRankingLastPlaces: returns [] for a player with no matching rows", async () => {
    jest
      .spyOn(RankingLastPlace, "findAll")
      .mockResolvedValue([{ playerId: "p1", systemId: PRIMARY.id, id: "rl1" } as RankingLastPlace]);

    const [a, b] = await Promise.all([
      service.getPrimaryRankingLastPlaces({ id: "p1" } as Player),
      service.getPrimaryRankingLastPlaces({ id: "p-missing" } as Player),
    ]);

    expect(a.map((r) => r.id)).toEqual(["rl1"]);
    expect(b).toEqual([]);
  });

  it("getPrimaryRankingLastPlaces: returns [] without scheduling a batch when player.id is falsy", async () => {
    const findAll = jest.spyOn(RankingLastPlace, "findAll").mockResolvedValue([]);

    const result = await service.getPrimaryRankingLastPlaces({
      id: undefined,
    } as unknown as Player);

    expect(findAll).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
