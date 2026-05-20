import { Test, TestingModule } from "@nestjs/testing";
import { DrawCompetition, SubEventCompetition } from "@badman/backend-database";
import { getQueueToken } from "@nestjs/bull";
import { Sequelize } from "sequelize-typescript";
import { DrawCompetitionResolver } from "./draw.resolver";
import { SubEventCompetitionLoaderService } from "../../../loaders";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { SyncQueue } from "@badman/backend-queue";

describe("DrawCompetitionResolver — DataLoader field resolvers", () => {
  let resolver: DrawCompetitionResolver;
  let subEventLoaderService: SubEventCompetitionLoaderService;

  const makeDraw = (overrides: Partial<DrawCompetition> = {}) =>
    ({
      id: "draw-uuid",
      subeventId: "subevent-uuid",
      ...overrides,
    }) as unknown as DrawCompetition;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawCompetitionResolver,
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
          provide: RankingSystemService,
          useValue: {},
        },
        {
          provide: SubEventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
      ],
    }).compile();

    resolver = module.get<DrawCompetitionResolver>(DrawCompetitionResolver);
    subEventLoaderService = module.get<SubEventCompetitionLoaderService>(
      SubEventCompetitionLoaderService
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe("subEventCompetition field resolver", () => {
    it("calls subEventLoader.load with draw.subeventId", async () => {
      const draw = makeDraw({ subeventId: "subevent-uuid" });
      const fakeSubEvent = { id: "subevent-uuid" } as unknown as SubEventCompetition;
      jest.spyOn(subEventLoaderService, "load").mockResolvedValue(fakeSubEvent);

      const result = await resolver.subEventCompetition(draw);

      expect(subEventLoaderService.load).toHaveBeenCalledWith("subevent-uuid");
      expect(result).toBe(fakeSubEvent);
    });

    it("returns null when subeventId is null", async () => {
      const draw = makeDraw({ subeventId: undefined });
      jest.spyOn(subEventLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.subEventCompetition(draw);

      expect(subEventLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("issues a loader call per draw when resolving multiple draws", async () => {
      const loadSpy = jest
        .spyOn(subEventLoaderService, "load")
        .mockResolvedValue({ id: "subevent-uuid" } as unknown as SubEventCompetition);

      const draws = Array.from({ length: 8 }, (_, i) =>
        makeDraw({ id: `draw-${i}`, subeventId: "subevent-uuid" })
      );

      await Promise.all(draws.map((d) => resolver.subEventCompetition(d)));

      expect(loadSpy).toHaveBeenCalledTimes(8);
      draws.forEach((d) => {
        expect(loadSpy).toHaveBeenCalledWith(d.subeventId);
      });
    });
  });
});
