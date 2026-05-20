import { Test, TestingModule } from "@nestjs/testing";
import { EventEntry, Player, SubEventCompetition } from "@badman/backend-database";
import { Sequelize } from "sequelize-typescript";
import { EventEntryResolver } from "./entry.resolver";
import { SubEventCompetitionLoaderService } from "../../loaders";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";

describe("EventEntryResolver — DataLoader field resolvers", () => {
  let resolver: EventEntryResolver;
  let subEventLoaderService: SubEventCompetitionLoaderService;

  const makeEntry = (overrides: Partial<EventEntry> = {}) =>
    ({
      id: "entry-uuid",
      subEventId: "subevent-uuid",
      ...overrides,
    }) as unknown as EventEntry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEntryResolver,
        EnrollmentFinalizeService,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyEnrollment: jest.fn() },
        },
        {
          provide: EnrollmentValidationService,
          useValue: { fetchAndValidate: jest.fn() },
        },
        {
          provide: EnrollmentValidationCacheService,
          useValue: { getForTeam: jest.fn() },
        },
        {
          provide: SubEventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
      ],
    }).compile();

    resolver = module.get<EventEntryResolver>(EventEntryResolver);
    subEventLoaderService = module.get<SubEventCompetitionLoaderService>(
      SubEventCompetitionLoaderService
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe("subEventCompetition field resolver", () => {
    it("calls subEventLoader.load with eventEntry.subEventId", async () => {
      const entry = makeEntry({ subEventId: "subevent-uuid" });
      const fakeSubEvent = { id: "subevent-uuid" } as unknown as SubEventCompetition;
      jest.spyOn(subEventLoaderService, "load").mockResolvedValue(fakeSubEvent);

      const result = await resolver.subEventCompetition(entry);

      expect(subEventLoaderService.load).toHaveBeenCalledWith("subevent-uuid");
      expect(result).toBe(fakeSubEvent);
    });

    it("returns null when subEventId is null", async () => {
      const entry = makeEntry({ subEventId: undefined });
      jest.spyOn(subEventLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.subEventCompetition(entry);

      expect(subEventLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("issues a loader call per entry when resolving multiple entries", async () => {
      const loadSpy = jest
        .spyOn(subEventLoaderService, "load")
        .mockResolvedValue({ id: "subevent-uuid" } as unknown as SubEventCompetition);

      const entries = Array.from({ length: 8 }, (_, i) =>
        makeEntry({ id: `entry-${i}`, subEventId: "subevent-uuid" })
      );

      await Promise.all(entries.map((e) => resolver.subEventCompetition(e)));

      expect(loadSpy).toHaveBeenCalledTimes(8);
      entries.forEach((e) => {
        expect(loadSpy).toHaveBeenCalledWith(e.subEventId);
      });
    });
  });
});
