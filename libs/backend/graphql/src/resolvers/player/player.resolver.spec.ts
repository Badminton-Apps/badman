import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import {
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
} from "@badman/backend-database";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { Sequelize } from "sequelize-typescript";
import { ListArgs } from "../../utils";
import { PlayersResolver, PlayerTeamResolver } from "./player.resolver";

type SystemServiceMock = { getPrimary: jest.Mock; getById: jest.Mock };

const systemFixture = (id: string): RankingSystem =>
  ({ id, amountOfLevels: 12, maxDiffLevels: 4 }) as unknown as RankingSystem;

const PRIMARY = systemFixture("primary-1");
const SYS_A = systemFixture("sys-a");
const SYS_B = systemFixture("sys-b");

describe("PlayersResolver — RankingSystemService integration", () => {
  let resolver: PlayersResolver;
  let rankingSystemService: SystemServiceMock;

  beforeEach(async () => {
    rankingSystemService = {
      getPrimary: jest.fn().mockResolvedValue(PRIMARY),
      getById: jest.fn(async (id: string) => (id === SYS_A.id ? SYS_A : id === SYS_B.id ? SYS_B : null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersResolver,
        { provide: Sequelize, useValue: { transaction: jest.fn() } },
        { provide: PointsService, useValue: {} },
        { provide: RankingSystemService, useValue: rankingSystemService },
      ],
    }).compile();

    resolver = module.get<PlayersResolver>(PlayersResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rankingPlaces: batches RankingSystem lookups by unique systemId", async () => {
    const places = [
      { systemId: SYS_A.id },
      { systemId: SYS_A.id },
      { systemId: SYS_B.id },
    ] as RankingPlace[];
    const player = {
      getRankingPlaces: jest.fn().mockResolvedValue(places),
    } as unknown as Player;

    const result = await resolver.rankingPlaces(player, {} as ListArgs);

    expect(result).toHaveLength(3);
    // 2 unique system ids, regardless of place count
    expect(rankingSystemService.getById).toHaveBeenCalledTimes(2);
    expect(rankingSystemService.getById).toHaveBeenCalledWith(SYS_A.id);
    expect(rankingSystemService.getById).toHaveBeenCalledWith(SYS_B.id);
    expect(rankingSystemService.getPrimary).not.toHaveBeenCalled();
  });

  it("rankingLastPlaces: uses cached primary + batches systems", async () => {
    const places = [{ systemId: SYS_A.id }, { systemId: SYS_A.id }] as RankingLastPlace[];
    const player = {
      getRankingLastPlaces: jest.fn().mockResolvedValue(places),
    } as unknown as Player;

    const result = await resolver.rankingLastPlaces(player, {} as ListArgs);

    expect(result).toHaveLength(2);
    expect(rankingSystemService.getPrimary).toHaveBeenCalledTimes(1);
    expect(rankingSystemService.getById).toHaveBeenCalledTimes(1);
    expect(rankingSystemService.getById).toHaveBeenCalledWith(SYS_A.id);
  });

  it("rankingPlaces: throws NotFoundException when system not in cache", async () => {
    const places = [{ systemId: "missing" }] as RankingPlace[];
    const player = {
      getRankingPlaces: jest.fn().mockResolvedValue(places),
    } as unknown as Player;

    await expect(resolver.rankingPlaces(player, {} as ListArgs)).rejects.toThrow(NotFoundException);
  });
});

describe("PlayerTeamResolver — RankingSystemService integration", () => {
  let resolver: PlayerTeamResolver;
  let rankingSystemService: SystemServiceMock;

  beforeEach(async () => {
    rankingSystemService = {
      getPrimary: jest.fn().mockResolvedValue(PRIMARY),
      getById: jest.fn(async (id: string) => (id === SYS_A.id ? SYS_A : null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerTeamResolver,
        { provide: Sequelize, useValue: { transaction: jest.fn() } },
        { provide: PointsService, useValue: {} },
        { provide: RankingSystemService, useValue: rankingSystemService },
      ],
    }).compile();

    resolver = module.get<PlayerTeamResolver>(PlayerTeamResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("override rankingLastPlaces: uses cached primary, batches systems by id", async () => {
    jest
      .spyOn(RankingLastPlace, "findAll")
      .mockResolvedValue([{ systemId: SYS_A.id }, { systemId: SYS_A.id }] as RankingLastPlace[]);

    const result = await resolver.rankingLastPlaces({ id: "p1" } as Player, {} as ListArgs);

    expect(result).toHaveLength(2);
    expect(rankingSystemService.getPrimary).toHaveBeenCalledTimes(1);
    expect(rankingSystemService.getById).toHaveBeenCalledTimes(1);
    expect(rankingSystemService.getById).toHaveBeenCalledWith(SYS_A.id);
  });

  it("override rankingPlaces: batches systems by unique id", async () => {
    jest
      .spyOn(RankingPlace, "findAll")
      .mockResolvedValue([{ systemId: SYS_A.id }] as RankingPlace[]);

    const result = await resolver.rankingPlaces({ id: "p1" } as Player, {} as ListArgs);

    expect(result).toHaveLength(1);
    expect(rankingSystemService.getById).toHaveBeenCalledTimes(1);
    expect(rankingSystemService.getById).toHaveBeenCalledWith(SYS_A.id);
  });
});
