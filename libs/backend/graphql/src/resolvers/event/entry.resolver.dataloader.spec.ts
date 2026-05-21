import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EventEntry, Player, Standing, SubEventCompetition, Team } from "@badman/backend-database";
import { Sequelize } from "sequelize-typescript";
import { EventEntryResolver } from "./entry.resolver";
import {
  StandingLoaderService,
  SubEventCompetitionLoaderService,
  TeamLoaderService,
} from "../../loaders";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";

// Suppress unused-variable warning — Player is referenced via import for type-guard purposes
void (Player as unknown);

describe("EventEntryResolver — DataLoader field resolvers", () => {
  let resolver: EventEntryResolver;
  let module: TestingModule;
  let subEventLoaderService: SubEventCompetitionLoaderService;
  let teamLoaderService: TeamLoaderService;
  let standingLoaderService: StandingLoaderService;
  let enrollmentValidationCacheService: EnrollmentValidationCacheService;

  const makeEntry = (overrides: Partial<EventEntry> = {}) =>
    ({
      id: "entry-uuid",
      subEventId: "subevent-uuid",
      teamId: "team-uuid",
      ...overrides,
    }) as unknown as EventEntry;

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
          provide: SubEventCompetitionLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: TeamLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: StandingLoaderService,
          useValue: { load: jest.fn() },
        },
        {
          provide: EnrollmentValidationCacheService,
          useValue: { getForTeam: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();

    resolver = module.get<EventEntryResolver>(EventEntryResolver);
    subEventLoaderService = module.get<SubEventCompetitionLoaderService>(
      SubEventCompetitionLoaderService
    );
    teamLoaderService = module.get<TeamLoaderService>(TeamLoaderService);
    standingLoaderService = module.get<StandingLoaderService>(StandingLoaderService);
    enrollmentValidationCacheService = module.get<EnrollmentValidationCacheService>(
      EnrollmentValidationCacheService
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

  describe("team batching", () => {
    it("calls teamLoader.load with eventEntry.teamId", async () => {
      const entry = makeEntry({ teamId: "team-1" });
      const fakeTeam = { id: "team-1" } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);

      const result = await resolver.team(entry);

      expect(teamLoaderService.load).toHaveBeenCalledWith("team-1");
      expect(result).toBe(fakeTeam);
    });

    it("issues a loader call per entry when resolving multiple entries concurrently", async () => {
      const fakeTeams: Record<string, Team> = {
        "team-1": { id: "team-1" } as unknown as Team,
        "team-2": { id: "team-2" } as unknown as Team,
        "team-3": { id: "team-3" } as unknown as Team,
      };
      const loadSpy = jest
        .spyOn(teamLoaderService, "load")
        .mockImplementation((id) => Promise.resolve(fakeTeams[id ?? ""] ?? null));

      const entries = [
        makeEntry({ id: "entry-1", teamId: "team-1" }),
        makeEntry({ id: "entry-2", teamId: "team-2" }),
        makeEntry({ id: "entry-3", teamId: "team-3" }),
      ];

      const results = await Promise.all(entries.map((e) => resolver.team(e)));

      expect(loadSpy).toHaveBeenCalledTimes(3);
      expect(loadSpy).toHaveBeenCalledWith("team-1");
      expect(loadSpy).toHaveBeenCalledWith("team-2");
      expect(loadSpy).toHaveBeenCalledWith("team-3");
      expect(results[0]).toBe(fakeTeams["team-1"]);
      expect(results[1]).toBe(fakeTeams["team-2"]);
      expect(results[2]).toBe(fakeTeams["team-3"]);
    });

    it("returns null when teamId is falsy", async () => {
      const entry = makeEntry({ teamId: undefined });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.team(entry);

      expect(teamLoaderService.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });
  });

  describe("standing batching", () => {
    it("calls standingLoader.load with eventEntry.id", async () => {
      const entry = makeEntry({ id: "entry-1" });
      const fakeStanding = { id: "standing-1", entryId: "entry-1" } as unknown as Standing;
      jest.spyOn(standingLoaderService, "load").mockResolvedValue(fakeStanding);

      const result = await resolver.standing(entry);

      expect(standingLoaderService.load).toHaveBeenCalledWith("entry-1");
      expect(result).toBe(fakeStanding);
    });

    it("issues a loader call per entry when resolving multiple entries concurrently", async () => {
      const fakeStandings: Record<string, Standing> = {
        "entry-1": { id: "s1", entryId: "entry-1" } as unknown as Standing,
        "entry-2": { id: "s2", entryId: "entry-2" } as unknown as Standing,
        "entry-3": { id: "s3", entryId: "entry-3" } as unknown as Standing,
      };
      const loadSpy = jest
        .spyOn(standingLoaderService, "load")
        .mockImplementation((id) => Promise.resolve(fakeStandings[id ?? ""] ?? null));

      const entries = [
        makeEntry({ id: "entry-1" }),
        makeEntry({ id: "entry-2" }),
        makeEntry({ id: "entry-3" }),
      ];

      const results = await Promise.all(entries.map((e) => resolver.standing(e)));

      expect(loadSpy).toHaveBeenCalledTimes(3);
      expect(loadSpy).toHaveBeenCalledWith("entry-1");
      expect(loadSpy).toHaveBeenCalledWith("entry-2");
      expect(loadSpy).toHaveBeenCalledWith("entry-3");
      expect(results[0]).toBe(fakeStandings["entry-1"]);
      expect(results[1]).toBe(fakeStandings["entry-2"]);
      expect(results[2]).toBe(fakeStandings["entry-3"]);
    });

    it("returns null when entry has no standing row", async () => {
      const entry = makeEntry({ id: "entry-no-standing" });
      jest.spyOn(standingLoaderService, "load").mockResolvedValue(null);

      const result = await resolver.standing(entry);

      expect(standingLoaderService.load).toHaveBeenCalledWith("entry-no-standing");
      expect(result).toBeNull();
    });
  });

  describe("enrollmentValidation reuses team loader", () => {
    it("calls teamLoader.load (not getTeam) when resolving enrollmentValidation", async () => {
      const entry = makeEntry({ id: "entry-1", teamId: "team-1" });
      const fakeTeam = { id: "team-1", clubId: "club-1", season: 2026 } as unknown as Team;
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(fakeTeam);
      jest.spyOn(enrollmentValidationCacheService, "getForTeam").mockResolvedValue(null);

      await resolver.enrollmentValidation(entry, true);

      expect(teamLoaderService.load).toHaveBeenCalledWith("team-1");
    });

    it("resolves team and enrollmentValidation using teamLoader for both paths", async () => {
      const entries = [
        makeEntry({ id: "entry-1", teamId: "team-1" }),
        makeEntry({ id: "entry-2", teamId: "team-2" }),
        makeEntry({ id: "entry-3", teamId: "team-3" }),
      ];
      const fakeTeam = (id: string) => ({ id, clubId: "club-1", season: 2026 }) as unknown as Team;

      const loadSpy = jest
        .spyOn(teamLoaderService, "load")
        .mockImplementation((id) => Promise.resolve(id ? fakeTeam(id) : null));

      jest.spyOn(enrollmentValidationCacheService, "getForTeam").mockResolvedValue(null);

      // Resolve both team and enrollmentValidation on all entries concurrently
      await Promise.all([
        ...entries.map((e) => resolver.team(e)),
        ...entries.map((e) => resolver.enrollmentValidation(e, true)),
      ]);

      // Both team() and enrollmentValidation() must route through teamLoader.load
      expect(loadSpy).toHaveBeenCalledWith("team-1");
      expect(loadSpy).toHaveBeenCalledWith("team-2");
      expect(loadSpy).toHaveBeenCalledWith("team-3");
    });

    it("returns null without calling getForTeam when team is not found", async () => {
      const entry = makeEntry({ id: "entry-1", teamId: "deleted-team" });
      jest.spyOn(teamLoaderService, "load").mockResolvedValue(null);
      const getForTeamSpy = jest.spyOn(enrollmentValidationCacheService, "getForTeam");

      const result = await resolver.enrollmentValidation(entry, true);

      expect(result).toBeNull();
      expect(getForTeamSpy).not.toHaveBeenCalled();
    });
  });
});
