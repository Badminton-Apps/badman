import { Test, TestingModule } from "@nestjs/testing";
import {
  DrawCompetition,
  EncounterCompetition,
  Team,
} from "@badman/backend-database";
import { getQueueToken } from "@nestjs/bull";
import { Sequelize } from "sequelize-typescript";
import { EncounterCompetitionResolver } from "./encounter.resolver";
import { DrawCompetitionLoaderService } from "../../../loaders/draw-competition-loader.service";
import { TeamLoaderService } from "../../../loaders/team-loader.service";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { SyncQueue } from "@badman/backend-queue";

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncounterCompetitionResolver,
        {
          provide: getQueueToken(SyncQueue),
          useValue: { add: jest.fn() },
        },
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: PointsService,
          useValue: {},
        },
        {
          provide: EncounterValidationService,
          useValue: {},
        },
        {
          provide: RankingSystemService,
          useValue: {},
        },
        {
          provide: TeamLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: DrawCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
      ],
    }).compile();

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
