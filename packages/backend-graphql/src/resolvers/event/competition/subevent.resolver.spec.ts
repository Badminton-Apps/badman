import { Test, TestingModule } from "@nestjs/testing";
import { EventCompetition, SubEventCompetition } from "@badman/backend-database";
import { getQueueToken } from "@nestjs/bull";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Sequelize } from "sequelize-typescript";
import { SubEventCompetitionResolver } from "./subevent.resolver";
import { EventCompetitionLoaderService } from "../../../loaders";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { SyncQueue } from "@badman/backend-queue";

describe("SubEventCompetitionResolver — DataLoader field resolvers", () => {
  let resolver: SubEventCompetitionResolver;
  let eventCompetitionLoaderService: EventCompetitionLoaderService;

  const makeSubEvent = (overrides: Partial<SubEventCompetition> = {}) =>
    ({
      id: "subevent-uuid",
      eventId: "event-uuid",
      ...overrides,
    }) as unknown as SubEventCompetition;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubEventCompetitionResolver,
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
        },
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
          provide: EventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
      ],
    }).compile();

    resolver = module.get<SubEventCompetitionResolver>(SubEventCompetitionResolver);
    eventCompetitionLoaderService = module.get<EventCompetitionLoaderService>(
      EventCompetitionLoaderService
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe("eventCompetition field resolver", () => {
    it("calls eventCompetitionLoader.load with subEvent.eventId", async () => {
      const subEvent = makeSubEvent({ eventId: "event-uuid" });
      const fakeEvent = { id: "event-uuid" } as unknown as EventCompetition;
      jest.spyOn(eventCompetitionLoaderService, "load").mockResolvedValue(fakeEvent);

      const result = await resolver.eventCompetition(subEvent);

      expect(eventCompetitionLoaderService.load).toHaveBeenCalledWith("event-uuid");
      expect(result).toBe(fakeEvent);
    });

    it("returns null when eventId is null", async () => {
      const subEvent = makeSubEvent({ eventId: undefined });
      jest.spyOn(eventCompetitionLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.eventCompetition(subEvent);

      expect(eventCompetitionLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("issues a single batch call for multiple subEvents sharing one eventId", async () => {
      const loadSpy = jest
        .spyOn(eventCompetitionLoaderService, "load")
        .mockResolvedValue({ id: "event-uuid" } as unknown as EventCompetition);

      const subEvents = Array.from({ length: 8 }, (_, i) =>
        makeSubEvent({ id: `subevent-${i}`, eventId: "event-uuid" })
      );

      await Promise.all(subEvents.map((s) => resolver.eventCompetition(s)));

      expect(loadSpy).toHaveBeenCalledTimes(8);
      subEvents.forEach((s) => {
        expect(loadSpy).toHaveBeenCalledWith(s.eventId);
      });
    });
  });
});
