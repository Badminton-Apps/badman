import { CronJob, EventCompetition, EventTournament } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { VisualService, XmlTournamentTypeID } from "@badman/backend-visual";
import { PointsService } from "@badman/backend-ranking";
import { Test, TestingModule } from "@nestjs/testing";
import { SyncEventsProcessor } from "../sync-events.processor";
import { CompetitionSyncer } from "../competition-sync";
import { TournamentSyncer } from "../tournament-sync";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { Sequelize } from "sequelize-typescript";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "job-1",
    data: {
      date: undefined,
      startDate: undefined,
      skip: [],
      search: "",
      id: "",
      official: undefined,
      only: [],
      offset: 0,
      limit: 0,
      userId: undefined,
      ...overrides,
    },
    progress: jest.fn(),
    extendLock: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCronJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cron-1",
    amount: 0,
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeXmlEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ID: "event-1",
    Name: "Test Event",
    TypeID: XmlTournamentTypeID.OnlineLeague,
    StartDate: new Date().toISOString(),
    ...overrides,
  };
}

function makeVisualService() {
  return {
    searchEvents: jest.fn().mockResolvedValue([]),
    getEvent: jest.fn().mockResolvedValue([]),
    getChangeEvents: jest.fn().mockResolvedValue([]),
  };
}

function makeNotificationService() {
  return {
    notifySyncFinished: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSequelize() {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };
  return {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
    _mockTransaction: mockTransaction,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("SyncEventsProcessor", () => {
  let processor: SyncEventsProcessor;
  let visualService: ReturnType<typeof makeVisualService>;
  let notificationService: ReturnType<typeof makeNotificationService>;
  let sequelize: ReturnType<typeof makeSequelize>;
  let pointsService: Partial<PointsService>;
  let cronJobFindOneSpy: jest.SpyInstance;
  let competitionSyncSpy: jest.SpyInstance;
  let tournamentSyncSpy: jest.SpyInstance;

  async function buildModule(configOverrides: Record<string, unknown> = {}) {
    visualService = makeVisualService();
    notificationService = makeNotificationService();
    sequelize = makeSequelize();
    pointsService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncEventsProcessor,
        { provide: VisualService, useValue: visualService },
        { provide: NotificationService, useValue: notificationService },
        { provide: PointsService, useValue: pointsService },
        { provide: Sequelize, useValue: sequelize },
      ],
    }).compile();

    processor = module.get(SyncEventsProcessor);
  }

  beforeEach(async () => {
    // Spy on prototype methods before module creation
    competitionSyncSpy = jest
      .spyOn(CompetitionSyncer.prototype, "process")
      .mockResolvedValue({ event: { id: "comp-1" } } as any);
    tournamentSyncSpy = jest
      .spyOn(TournamentSyncer.prototype, "process")
      .mockResolvedValue({ event: { id: "tourn-1" } } as any);

    await buildModule();
    cronJobFindOneSpy = jest.spyOn(CronJob, "findOne").mockResolvedValue(makeCronJob() as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("event source routing", () => {
    it("searches events when search term provided", async () => {
      const events = [makeXmlEvent({ Name: "Event 1" }), makeXmlEvent({ Name: "Event 2", ID: "event-2" })];
      visualService.searchEvents.mockResolvedValue(events as any);

      const job = makeJob({ search: "league" });
      await processor.syncEvents(job as any);

      expect(visualService.searchEvents).toHaveBeenCalledWith("league");
      expect(visualService.getEvent).not.toHaveBeenCalled();
      expect(visualService.getChangeEvents).not.toHaveBeenCalled();
    });

    it("fetches specific event by id", async () => {
      const event = makeXmlEvent();
      visualService.getEvent.mockResolvedValue([event] as any);

      const job = makeJob({ id: "123" });
      await processor.syncEvents(job as any);

      expect(visualService.getEvent).toHaveBeenCalledWith("123");
      expect(visualService.searchEvents).not.toHaveBeenCalled();
      expect(visualService.getChangeEvents).not.toHaveBeenCalled();
    });

    it("fetches change events when no search or id", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(visualService.getChangeEvents).toHaveBeenCalled();
      expect(visualService.searchEvents).not.toHaveBeenCalled();
      expect(visualService.getEvent).not.toHaveBeenCalled();
    });

    it("handles multiple event ids", async () => {
      const event1 = makeXmlEvent({ ID: "event-1" });
      const event2 = makeXmlEvent({ ID: "event-2" });
      visualService.getEvent
        .mockResolvedValueOnce([event1] as any)
        .mockResolvedValueOnce([event2] as any);

      const job = makeJob({ id: ["id-1", "id-2"] });
      await processor.syncEvents(job as any);

      expect(visualService.getEvent).toHaveBeenCalledTimes(2);
    });

    it("strips URL prefixes from event ids", async () => {
      const event = makeXmlEvent();
      visualService.getEvent.mockResolvedValue([event] as any);

      const job = makeJob({ id: "https://www.toernooi.nl/sport/league?id=12345" });
      await processor.syncEvents(job as any);

      expect(visualService.getEvent).toHaveBeenCalledWith("12345");
    });
  });

  describe("event type routing", () => {
    it("routes OnlineLeague to CompetitionSyncer", async () => {
      const event = makeXmlEvent({ TypeID: XmlTournamentTypeID.OnlineLeague });
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).toHaveBeenCalled();
      expect(tournamentSyncSpy).not.toHaveBeenCalled();
    });

    it("routes TeamTournament to CompetitionSyncer", async () => {
      const event = makeXmlEvent({ TypeID: XmlTournamentTypeID.TeamTournament });
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).toHaveBeenCalled();
      expect(tournamentSyncSpy).not.toHaveBeenCalled();
    });

    it("routes other types to TournamentSyncer", async () => {
      const event = makeXmlEvent({ TypeID: XmlTournamentTypeID.IndividualTournament });
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(tournamentSyncSpy).toHaveBeenCalled();
      expect(competitionSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe("transaction handling", () => {
    it("commits transaction on successful sync", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(sequelize._mockTransaction.commit).toHaveBeenCalled();
      expect(sequelize._mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("rolls back transaction on syncer error", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);
      competitionSyncSpy.mockRejectedValue(new Error("Sync failed"));

      const job = makeJob();
      await expect(processor.syncEvents(job as any)).rejects.toThrow("Sync failed");

      expect(sequelize._mockTransaction.rollback).toHaveBeenCalled();
      expect(sequelize._mockTransaction.commit).not.toHaveBeenCalled();
    });

  });

  describe("notifications", () => {
    it("notifies user of successful sync", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob({ userId: "user-1" });
      await processor.syncEvents(job as any);

      expect(notificationService.notifySyncFinished).toHaveBeenCalledWith("user-1", {
        event: expect.any(Object),
        success: true,
      });
    });

    it("notifies user of failed sync", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);
      competitionSyncSpy.mockRejectedValue(new Error("Sync failed"));

      const job = makeJob({ userId: "user-1" });
      await expect(processor.syncEvents(job as any)).rejects.toThrow();

      expect(notificationService.notifySyncFinished).toHaveBeenCalledWith("user-1", {
        event: expect.objectContaining({ name: event.Name }),
        success: false,
      });
    });

    it("notifies multiple users", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob({ userId: ["user-1", "user-2"] });
      await processor.syncEvents(job as any);

      expect(notificationService.notifySyncFinished).toHaveBeenCalledWith("user-1", expect.any(Object));
      expect(notificationService.notifySyncFinished).toHaveBeenCalledWith("user-2", expect.any(Object));
    });

    it("does not notify when no userId provided", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(notificationService.notifySyncFinished).not.toHaveBeenCalled();
    });
  });

  describe("filtering", () => {
    it("skips events in skip list", async () => {
      const event1 = makeXmlEvent({ Name: "Event 1" });
      const event2 = makeXmlEvent({ Name: "Skipped Event", ID: "event-2" });
      visualService.getChangeEvents.mockResolvedValue([event1, event2] as any);

      const job = makeJob({ skip: ["Skipped Event"] });
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).toHaveBeenCalledTimes(1); // Only event1
      expect(competitionSyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ xmlTournament: expect.objectContaining({ Name: "Event 1" }) })
      );
    });

    it("only processes events in only list", async () => {
      const event1 = makeXmlEvent({ Name: "Event 1" });
      const event2 = makeXmlEvent({ Name: "Event 2", ID: "event-2" });
      const event3 = makeXmlEvent({ Name: "Selected", ID: "event-3" });
      visualService.getChangeEvents.mockResolvedValue([event1, event2, event3] as any);

      const job = makeJob({ only: ["Selected"] });
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).toHaveBeenCalledTimes(1);
      expect(competitionSyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ xmlTournament: expect.objectContaining({ Name: "Selected" }) })
      );
    });

    it("filters events by startDate", async () => {
      const pastEvent = new Date();
      pastEvent.setDate(pastEvent.getDate() - 5);
      const futureEvent = new Date();
      futureEvent.setDate(futureEvent.getDate() + 5);

      const event1 = makeXmlEvent({ StartDate: pastEvent.toISOString() });
      const event2 = makeXmlEvent({ StartDate: futureEvent.toISOString(), ID: "event-2" });
      visualService.getChangeEvents.mockResolvedValue([event1, event2] as any);

      const startDate = new Date();
      const job = makeJob({ startDate });
      await processor.syncEvents(job as any);

      // Only event2 (future) should be processed
      expect(competitionSyncSpy).toHaveBeenCalledTimes(1);
      expect(competitionSyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ xmlTournament: expect.objectContaining({ ID: "event-2" }) })
      );
    });

  });

  describe("CronJob guards", () => {
    it("throws when CronJob not found", async () => {
      cronJobFindOneSpy.mockResolvedValue(null);

      const job = makeJob();
      await expect(processor.syncEvents(job as any)).rejects.toThrow("Job not found");
    });

    it("increments and decrements CronJob amount", async () => {
      const cronJob = makeCronJob({ amount: 0 });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);
      visualService.getChangeEvents.mockResolvedValue([]);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(cronJob.save).toHaveBeenCalledTimes(2); // once at start (amount++), once in finally
      expect(cronJob.amount).toBe(0); // incremented to 1, then decremented to 0
    });

    it("updates lastRun in finally", async () => {
      const cronJob = makeCronJob();
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);
      visualService.getChangeEvents.mockResolvedValue([]);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(cronJob.lastRun).toEqual(expect.any(Date));
      expect(cronJob.save).toHaveBeenCalledTimes(2);
    });
  });

  describe("progress tracking", () => {
    it("updates job progress during processing", async () => {
      const events = [
        makeXmlEvent({ Name: "Event 1" }),
        makeXmlEvent({ Name: "Event 2", ID: "event-2" }),
      ];
      visualService.getChangeEvents.mockResolvedValue(events as any);

      const job = makeJob();
      await processor.syncEvents(job as any);

      expect(job.progress).toHaveBeenCalled();
      // Should be called for each event
      expect(job.progress).toHaveBeenCalledTimes(2);
    });
  });

  describe("syncer configuration", () => {
    it("passes job options to syncer", async () => {
      const event = makeXmlEvent();
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob({ official: true, skip: ["test"] });
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            official: true,
            skip: ["test"],
          }),
        })
      );
    });

    it("skips competition sync when competition in skip list", async () => {
      const event = makeXmlEvent({ TypeID: XmlTournamentTypeID.OnlineLeague });
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob({ skip: ["competition"] });
      await processor.syncEvents(job as any);

      expect(competitionSyncSpy).not.toHaveBeenCalled();
    });

    it("skips tournament sync when tournament in skip list", async () => {
      const event = makeXmlEvent({ TypeID: XmlTournamentTypeID.IndividualTournament });
      visualService.getChangeEvents.mockResolvedValue([event] as any);

      const job = makeJob({ skip: ["tournament"] });
      await processor.syncEvents(job as any);

      expect(tournamentSyncSpy).not.toHaveBeenCalled();
    });
  });
});
