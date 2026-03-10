import { CronJob, EncounterCompetition } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CheckEncounterProcessor } from "../check-encounters.processor";
import { EncounterDetailPageService } from "../encounter-detail-page.service";
import { SearchService } from "@badman/backend-search";
import { Sync, SyncQueue } from "@badman/backend-queue";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<{ encounterId: string }> = {}) {
  return {
    id: "job-1",
    data: overrides,
    progress: jest.fn(),
    extendLock: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCronJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cron-1",
    amount: 0,
    lastRun: new Date(),
    running: false,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEncounter(overrides: Partial<Record<string, unknown>> = {}) {
  const eventCompetition = {
    id: "event-1",
    visualCode: "EV001",
    name: "Event",
    checkEncounterForFilledIn: true,
    contact: { id: "player-1", email: "contact@example.com" },
  };

  const baseHomeTeam = {
    id: "team-1",
    name: "Home Team",
    club: { id: "club-1", name: "Club 1", slug: "club-1" },
  };

  const baseAwayTeam = {
    id: "team-2",
    name: "Away Team",
    club: { id: "club-2", name: "Club 2", slug: "club-2" },
  };

  const homeTeam = (overrides && overrides.homeTeam) ? overrides.homeTeam : baseHomeTeam;
  const awayTeam = (overrides && overrides.awayTeam) ? overrides.awayTeam : baseAwayTeam;

  const otherOverrides = Object.fromEntries(
    Object.entries(overrides || {}).filter(([key]) => key !== "homeTeam" && key !== "awayTeam")
  );

  return {
    id: "enc-1",
    visualCode: "VC001",
    date: new Date(),
    enteredOn: null,
    acceptedOn: null,
    startHour: null,
    endHour: null,
    shuttle: null,
    gameLeader: null,
    accepted: false,
    homeTeam,
    awayTeam,
    drawCompetition: {
      id: "draw-1",
      subEventCompetition: {
        id: "sub-1",
        eventId: "event-1",
        eventCompetition,
        getEventCompetition: jest.fn().mockResolvedValue(eventCompetition),
      },
    },
    save: jest.fn().mockResolvedValue(undefined),
    setGameLeader: jest.fn().mockResolvedValue(undefined),
    ...otherOverrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    VR_API_USER: "user",
    VR_API_PASS: "pass",
    VR_ACCEPT_ENCOUNTERS: false,
    NODE_ENV: "test",
  };
  return { get: jest.fn((key: string) => defaults[key] ?? undefined) };
}

function makeDetailPageService() {
  return {
    isOpen: jest.fn().mockReturnValue(false),
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    acceptCookies: jest.fn().mockResolvedValue(undefined),
    gotoEncounterPage: jest.fn().mockResolvedValue("https://example.com/encounter/1"),
    consentPrivacyAndCookie: jest.fn().mockResolvedValue(undefined),
    hasTime: jest.fn().mockResolvedValue(true),
    getDetailEntered: jest.fn().mockResolvedValue({ entered: false, enteredOn: null }),
    getDetailAccepted: jest.fn().mockResolvedValue({ accepted: false, acceptedOn: null }),
    getDetailComment: jest.fn().mockResolvedValue({ hasComment: false }),
    signIn: jest.fn().mockResolvedValue(undefined),
    acceptEncounter: jest.fn().mockResolvedValue(true),
    getDetailInfo: jest.fn().mockResolvedValue({
      startedOn: "20:00",
      endedOn: "22:00",
      usedShuttle: "RSL6",
      gameLeader: null,
    }),
  };
}

function makeNotificationService() {
  return {
    notifyEncounterHasComment: jest.fn().mockResolvedValue(undefined),
    notifyEncounterNotEntered: jest.fn().mockResolvedValue(undefined),
    notifyEncounterNotAccepted: jest.fn().mockResolvedValue(undefined),
    notifySyncEncounterFailed: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSearchService() {
  return {
    searchPlayers: jest.fn().mockResolvedValue([]),
    getParts: jest.fn().mockReturnValue([]),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("CheckEncounterProcessor", () => {
  let processor: CheckEncounterProcessor;
  let detailPage: ReturnType<typeof makeDetailPageService>;
  let notificationService: ReturnType<typeof makeNotificationService>;
  let searchService: ReturnType<typeof makeSearchService>;
  let configService: ReturnType<typeof makeConfig>;
  let findAndCountAllSpy: jest.SpyInstance;
  let findByPkSpy: jest.SpyInstance;
  let cronJobFindOneSpy: jest.SpyInstance;

  async function buildModule(configOverrides: Record<string, unknown> = {}) {
    detailPage = makeDetailPageService();
    notificationService = makeNotificationService();
    searchService = makeSearchService();
    configService = makeConfig(configOverrides);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckEncounterProcessor,
        { provide: ConfigService, useValue: configService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SearchService, useValue: searchService },
        { provide: EncounterDetailPageService, useValue: detailPage },
      ],
    }).compile();

    processor = module.get(CheckEncounterProcessor);
  }

  beforeEach(async () => {
    await buildModule();
    cronJobFindOneSpy = jest.spyOn(CronJob, "findOne").mockResolvedValue(makeCronJob() as any);
    findAndCountAllSpy = jest
      .spyOn(EncounterCompetition, "findAndCountAll")
      .mockResolvedValue({ count: 0, rows: [] } as any);
    findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("syncEncounters (batch job)", () => {
    it("finds and processes batch of encounters", async () => {
      const encounters = [makeEncounter({ id: "enc-1" }), makeEncounter({ id: "enc-2" })];
      findAndCountAllSpy.mockResolvedValue({ count: 2, rows: encounters } as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn: new Date() });

      const job = makeJob();
      await processor.syncEncounters(job as any);

      expect(findAndCountAllSpy).toHaveBeenCalled();
      expect(detailPage.open).toHaveBeenCalled();
      expect(detailPage.close).toHaveBeenCalled();
      expect(cronJobFindOneSpy).toHaveBeenCalled();
    });

    it("throws when CronJob not found", async () => {
      cronJobFindOneSpy.mockResolvedValue(null);

      const job = makeJob();
      await expect(processor.syncEncounters(job as any)).rejects.toThrow("Job not found");
    });

    it("returns early when CronJob already running", async () => {
      const cronJob = makeCronJob({ running: true, amount: 1 });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);

      const job = makeJob();
      await processor.syncEncounters(job as any);

      expect(findAndCountAllSpy).not.toHaveBeenCalled();
    });

    it("decrements CronJob amount in finally", async () => {
      const cronJob = makeCronJob({ amount: 0 });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);

      const job = makeJob();
      await processor.syncEncounters(job as any);

      expect(cronJob.save).toHaveBeenCalledTimes(2); // once at start (amount++), once in finally
      expect(cronJob.amount).toBe(0); // incremented to 1, then decremented to 0
    });

    it("handles empty encounter list", async () => {
      findAndCountAllSpy.mockResolvedValue({ count: 0, rows: [] } as any);

      const job = makeJob();
      await processor.syncEncounters(job as any);

      expect(detailPage.open).not.toHaveBeenCalled();
    });

    it("chunks encounters into groups of 10", async () => {
      const encounters = Array.from({ length: 25 }, (_, i) =>
        makeEncounter({ id: `enc-${i}` })
      );
      findAndCountAllSpy.mockResolvedValue({ count: 25, rows: encounters } as any);

      const job = makeJob();
      await processor.syncEncounters(job as any);

      // Should open page for each chunk (3 chunks: 0-9, 10-19, 20-24)
      expect(detailPage.open).toHaveBeenCalledTimes(3);
    });
  });

  describe("syncEncounter (single job)", () => {
    it("processes single encounter successfully", async () => {
      const encounter = makeEncounter({ id: "enc-1" });
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn: new Date() });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(findByPkSpy).toHaveBeenCalledWith("enc-1", expect.any(Object));
      expect(detailPage.open).toHaveBeenCalled();
      expect(detailPage.gotoEncounterPage).toHaveBeenCalled();
      expect(encounter.save).toHaveBeenCalled();
    });

    it("returns early when encounter not found", async () => {
      findByPkSpy.mockResolvedValue(null);

      const job = makeJob({ encounterId: "enc-missing" });
      await processor.syncEncounter(job as any);

      expect(detailPage.open).not.toHaveBeenCalled();
    });


    it("throws error when processing fails", async () => {
      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.gotoEncounterPage.mockRejectedValue(new Error("Network error"));

      const job = makeJob({ encounterId: "enc-1" });
      await expect(processor.syncEncounter(job as any)).rejects.toThrow("Network error");
    });
  });

  describe("encounter detail updates", () => {
    it("updates encounter when entered", async () => {
      const encounter = makeEncounter();
      const enteredOn = new Date();
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailInfo.mockResolvedValue({
        startedOn: "20:00",
        endedOn: "22:00",
        usedShuttle: "RSL6",
        gameLeader: null,
      });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(encounter.enteredOn).toEqual(enteredOn);
      expect(encounter.startHour).toBe("20:00");
      expect(encounter.endHour).toBe("22:00");
      expect(encounter.shuttle).toBe("RSL6");
      expect(encounter.save).toHaveBeenCalled();
    });

    it("updates encounter when accepted", async () => {
      const encounter = makeEncounter();
      const enteredOn = new Date();
      const acceptedOn = new Date();
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailAccepted.mockResolvedValue({ accepted: true, acceptedOn });
      detailPage.getDetailInfo.mockResolvedValue({
        startedOn: null,
        endedOn: null,
        usedShuttle: null,
        gameLeader: null,
      });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(encounter.acceptedOn).toEqual(acceptedOn);
      expect(encounter.accepted).toBe(true);
      expect(encounter.save).toHaveBeenCalled();
    });

    it("searches and sets game leader when present", async () => {
      const encounter = makeEncounter();
      const enteredOn = new Date();
      const gameLeaderPlayer = { id: "player-1", fullName: "John Doe" };
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailInfo.mockResolvedValue({
        startedOn: "20:00",
        endedOn: "22:00",
        usedShuttle: "RSL6",
        gameLeader: "John Doe",
      });
      searchService.getParts.mockReturnValue(["John", "Doe"]);
      searchService.searchPlayers.mockResolvedValue([gameLeaderPlayer] as any);

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(searchService.searchPlayers).toHaveBeenCalled();
      expect(encounter.setGameLeader).toHaveBeenCalledWith(gameLeaderPlayer);
    });

    it("does not set game leader if multiple players found", async () => {
      const encounter = makeEncounter();
      const enteredOn = new Date();
      const players = [{ id: "player-1" }, { id: "player-2" }];
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailInfo.mockResolvedValue({
        startedOn: "20:00",
        endedOn: "22:00",
        usedShuttle: "RSL6",
        gameLeader: "John Doe",
      });
      searchService.getParts.mockReturnValue(["John", "Doe"]);
      searchService.searchPlayers.mockResolvedValue(players as any);

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(encounter.setGameLeader).not.toHaveBeenCalled();
    });
  });

  describe("notifications and auto-accept", () => {
    beforeEach(() => {
      findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);
    });

    it("sends notification when encounter not entered", async () => {
      const encounterDate = new Date();
      encounterDate.setDate(encounterDate.getDate() - 3); // 3 days ago (> 24h)
      const encounter = makeEncounter({ date: encounterDate });
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: false, enteredOn: null });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(notificationService.notifyEncounterNotEntered).toHaveBeenCalledWith(encounter);
    });

    it("sends notification when encounter not accepted", async () => {
      const encounterDate = new Date();
      encounterDate.setDate(encounterDate.getDate() - 3); // 3 days ago (> 48h)
      const encounter = makeEncounter({ date: encounterDate });
      const enteredOn = new Date();
      enteredOn.setDate(enteredOn.getDate() - 1); // 1 day ago
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailAccepted.mockResolvedValue({ accepted: false, acceptedOn: null });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(notificationService.notifyEncounterNotAccepted).toHaveBeenCalledWith(encounter);
    });


    it("does not auto-accept when VR_ACCEPT_ENCOUNTERS disabled", async () => {
      await buildModule({ VR_ACCEPT_ENCOUNTERS: false });
      cronJobFindOneSpy = jest.spyOn(CronJob, "findOne").mockResolvedValue(makeCronJob() as any);

      const encounterDate = new Date();
      encounterDate.setDate(encounterDate.getDate() - 3); // 3 days ago (> 48h)
      const encounter = makeEncounter({
        date: encounterDate,
        awayTeam: {
          id: "team-2",
          name: "Away Team",
          club: { id: "club-2", name: "Club 2", slug: "club-2" },
        },
      });
      const enteredOn = new Date();
      enteredOn.setDate(enteredOn.getDate() - 2); // 2 days ago (> 36h after enter)
      findByPkSpy.mockResolvedValue(encounter as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: true, enteredOn });
      detailPage.getDetailAccepted.mockResolvedValue({ accepted: false, acceptedOn: null });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(detailPage.signIn).not.toHaveBeenCalled();
      expect(detailPage.acceptEncounter).not.toHaveBeenCalled();
    });

  });

  describe("error handling", () => {
    it("cleans up page resources on error", async () => {
      findByPkSpy.mockResolvedValue(makeEncounter() as any);
      detailPage.gotoEncounterPage.mockRejectedValue(new Error("Network error"));

      const job = makeJob({ encounterId: "enc-1" });
      await expect(processor.syncEncounter(job as any)).rejects.toThrow();

      expect(detailPage.close).toHaveBeenCalled();
    });

    it("cleans up page resources after successful sync", async () => {
      findByPkSpy.mockResolvedValue(makeEncounter() as any);
      detailPage.getDetailEntered.mockResolvedValue({ entered: false, enteredOn: null });

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(detailPage.close).toHaveBeenCalled();
    });

    it("skips encounter if has no time", async () => {
      findByPkSpy.mockResolvedValue(makeEncounter() as any);
      detailPage.hasTime.mockResolvedValue(false);

      const job = makeJob({ encounterId: "enc-1" });
      await processor.syncEncounter(job as any);

      expect(detailPage.getDetailEntered).not.toHaveBeenCalled();
    });
  });
});
