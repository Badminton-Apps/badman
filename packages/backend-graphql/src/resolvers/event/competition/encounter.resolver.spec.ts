import { Test, TestingModule } from "@nestjs/testing";
import { DrawCompetition, EncounterCompetition, Player, Team } from "@badman/backend-database";
import { getQueueToken } from "@nestjs/bull";
import { Op, QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { EncounterCompetitionResolver } from "./encounter.resolver";
import { DrawCompetitionLoaderService } from "../../../loaders/draw-competition-loader.service";
import { TeamLoaderService } from "../../../loaders/team-loader.service";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { EncounterGamesGenerationService } from "@badman/backend-encounter-games";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { SyncQueue } from "@badman/backend-queue";

const makeModule = async (sequelizeMock: Partial<Sequelize>) => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EncounterCompetitionResolver,
      {
        provide: getQueueToken(SyncQueue),
        useValue: { add: jest.fn() },
      },
      {
        provide: Sequelize,
        useValue: { transaction: jest.fn(), ...sequelizeMock },
      },
      { provide: PointsService, useValue: {} },
      { provide: EncounterValidationService, useValue: {} },
      { provide: EncounterGamesGenerationService, useValue: {} },
      { provide: RankingSystemService, useValue: {} },
      { provide: TeamLoaderService, useValue: { load: jest.fn() } },
      { provide: DrawCompetitionLoaderService, useValue: { load: jest.fn() } },
    ],
  }).compile();
  return module;
};

const makePlayer = (id: string | undefined) =>
  ({ id, hasAnyPermission: jest.fn().mockReturnValue(false) }) as unknown as Player;

const makeEncounterModel = (id: string) =>
  ({ id, date: new Date("2025-01-01") }) as unknown as EncounterCompetition;

describe("EncounterCompetitionResolver — DataLoader field resolvers", () => {
  let resolver: EncounterCompetitionResolver;
  let teamLoaderService: TeamLoaderService;
  let drawLoaderService: DrawCompetitionLoaderService;

  const makeEncounter = (overrides: Partial<EncounterCompetition> = {}) =>
    ({
      id: "enc-uuid",
      homeTeamId: "home-team-uuid",
      awayTeamId: "away-team-uuid",
      drawId: "draw-uuid",
      ...overrides,
    }) as unknown as EncounterCompetition;

  beforeEach(async () => {
    const module = await makeModule({});
    resolver = module.get<EncounterCompetitionResolver>(EncounterCompetitionResolver);
    teamLoaderService = module.get<TeamLoaderService>(TeamLoaderService);
    drawLoaderService = module.get<DrawCompetitionLoaderService>(DrawCompetitionLoaderService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("home field resolver", () => {
    it("calls teamLoader.load with encounter.homeTeamId", async () => {
      const encounter = makeEncounter({ homeTeamId: "home-team-uuid" });
      const fakeTeam = { id: "home-team-uuid" } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);

      const result = await resolver.home(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith("home-team-uuid");
      expect(result).toBe(fakeTeam);
    });

    it("returns null when homeTeamId is null", async () => {
      const encounter = makeEncounter({ homeTeamId: undefined });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.home(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(teamLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.home(encounter);

      expect(result).toBeNull();
    });
  });

  describe("away field resolver", () => {
    it("calls teamLoader.load with encounter.awayTeamId", async () => {
      const encounter = makeEncounter({ awayTeamId: "away-team-uuid" });
      const fakeTeam = { id: "away-team-uuid" } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);

      const result = await resolver.away(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith("away-team-uuid");
      expect(result).toBe(fakeTeam);
    });

    it("returns null when awayTeamId is null", async () => {
      const encounter = makeEncounter({ awayTeamId: undefined });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.away(encounter);

      expect(teamLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(teamLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.away(encounter);

      expect(result).toBeNull();
    });
  });

  describe("drawCompetition field resolver", () => {
    it("calls drawLoader.load with encounter.drawId", async () => {
      const encounter = makeEncounter({ drawId: "draw-uuid" });
      const fakeDraw = { id: "draw-uuid" } as unknown as DrawCompetition;
      jest.spyOn(drawLoaderService, "load").mockResolvedValue(fakeDraw);

      const result = await resolver.drawCompetition(encounter);

      expect(drawLoaderService.load).toHaveBeenCalledWith("draw-uuid");
      expect(result).toBe(fakeDraw);
    });

    it("returns null when drawId is null", async () => {
      const encounter = makeEncounter({ drawId: undefined });
      jest.spyOn(drawLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.drawCompetition(encounter);

      expect(drawLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("returns null when loader throws", async () => {
      const encounter = makeEncounter();
      jest.spyOn(drawLoaderService, "load").mockRejectedValue(new Error("DB error"));

      const result = await resolver.drawCompetition(encounter);

      expect(result).toBeNull();
    });
  });

  describe("home + away batching via shared TeamLoaderService", () => {
    it("uses the same teamLoader instance for both home and away calls", async () => {
      const homeEncounter = makeEncounter({ homeTeamId: "team-1" });
      const awayEncounter = makeEncounter({ awayTeamId: "team-2" });
      const teamA = { id: "team-1" } as unknown as Team;
      const teamB = { id: "team-2" } as unknown as Team;

      const loadSpy = jest
        .spyOn(teamLoaderService, "load")
        .mockImplementation(async (id) => (id === "team-1" ? teamA : teamB));

      const [homeResult, awayResult] = await Promise.all([
        resolver.home(homeEncounter),
        resolver.away(awayEncounter),
      ]);

      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(loadSpy).toHaveBeenCalledWith("team-1");
      expect(loadSpy).toHaveBeenCalledWith("team-2");
      expect(homeResult).toBe(teamA);
      expect(awayResult).toBe(teamB);
    });
  });
});

describe("EncounterCompetitionResolver — playerEncounterCompetitions", () => {
  let resolver: EncounterCompetitionResolver;
  let sequelizeQuerySpy: jest.SpyInstance;
  const queryMock = jest.fn();

  beforeEach(async () => {
    const module = await makeModule({ query: queryMock });
    resolver = module.get<EncounterCompetitionResolver>(EncounterCompetitionResolver);
    sequelizeQuerySpy = queryMock;
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns [] when user has no id", async () => {
    const result = await resolver.playerEncounterCompetitions(makePlayer(undefined), {});
    expect(result).toEqual([]);
    expect(sequelizeQuerySpy).not.toHaveBeenCalled();
  });

  it("returns [] when raw query finds no matching encounters", async () => {
    sequelizeQuerySpy.mockResolvedValue([]);
    jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([]);

    const result = await resolver.playerEncounterCompetitions(makePlayer("player-1"), {});
    expect(result).toEqual([]);
    expect(EncounterCompetition.findAll).not.toHaveBeenCalled();
  });

  it("returns [] when raw query result is not an array (defensive guard)", async () => {
    sequelizeQuerySpy.mockResolvedValue(null as never);

    const result = await resolver.playerEncounterCompetitions(makePlayer("player-1"), {});
    expect(result).toEqual([]);
  });

  it("returns [] and does not throw when raw query rejects", async () => {
    sequelizeQuerySpy.mockRejectedValue(new Error("DB exploded"));

    const result = await resolver.playerEncounterCompetitions(makePlayer("player-1"), {});
    expect(result).toEqual([]);
  });

  it("fetches encounters by IDs returned from raw query", async () => {
    const enc1 = makeEncounterModel("enc-1");
    const enc2 = makeEncounterModel("enc-2");

    sequelizeQuerySpy.mockResolvedValue([
      { id: "enc-1", date: new Date() },
      { id: "enc-2", date: new Date() },
    ]);
    jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([enc1, enc2]);

    const result = await resolver.playerEncounterCompetitions(makePlayer("player-1"), {
      take: 3,
      skip: 0,
    });

    expect(result).toEqual([enc1, enc2]);
    expect(EncounterCompetition.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { [Op.in]: ["enc-1", "enc-2"] } },
      })
    );
  });

  it("passes playerId as replacement to raw query", async () => {
    sequelizeQuerySpy.mockResolvedValue([]);

    await resolver.playerEncounterCompetitions(makePlayer("player-abc"), {});

    expect(sequelizeQuerySpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        replacements: { playerId: "player-abc" },
        type: QueryTypes.SELECT,
      })
    );
  });

  it("skips rows with non-string id in raw query result", async () => {
    sequelizeQuerySpy.mockResolvedValue([{ id: 42 }, { id: "valid-enc" }, null, {}]);
    const enc = makeEncounterModel("valid-enc");
    jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([enc]);

    const result = await resolver.playerEncounterCompetitions(makePlayer("player-1"), {});
    expect(result).toEqual([enc]);
  });

  it("uses CTE + UNION query shape, not correlated subquery", async () => {
    sequelizeQuerySpy.mockResolvedValue([]);

    await resolver.playerEncounterCompetitions(makePlayer("player-1"), {});

    const sql: string = sequelizeQuerySpy.mock.calls[0][0];

    // CTE must pre-compute completed encounters once
    expect(sql).toMatch(/WITH\s+completed\s+AS/i);
    // UNION branches replace the multi-join
    expect(sql).toMatch(/\bUNION\b/i);
    // Must NOT use a correlated subquery for the 8-game check
    expect(sql).not.toMatch(/SELECT\s+COUNT\s*\(\s*\*\s*\)\s*FROM\s+event\."Games"/i);
  });
});
