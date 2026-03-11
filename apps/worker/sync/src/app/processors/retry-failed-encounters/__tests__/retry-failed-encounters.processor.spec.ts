import { CronJob, EncounterCompetition } from "@badman/backend-database";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";
import { RetryFailedEncounterSyncProcessor } from "../retry-failed-encounters.processor";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeJob() {
  return {
    id: "job-1",
    data: {},
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
  return {
    id: "enc-1",
    visualCode: "VC001",
    date: new Date("2026-03-09T18:00:00Z"),
    finished: true,
    enteredOn: new Date("2026-03-09T20:00:00Z"),
    scoresSyncedAt: null,
    drawCompetition: {
      id: "draw-1",
      subEventCompetition: {
        id: "sub-1",
        eventId: "event-1",
        eventCompetition: {
          id: "event-1",
          visualCode: "EV001",
        },
      },
    },
    games: [{ id: "game-1" }],
    ...overrides,
  };
}

function makeSyncQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: "queued-job-1" }),
    getJobs: jest.fn().mockResolvedValue([]),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("RetryFailedEncounterSyncProcessor", () => {
  let processor: RetryFailedEncounterSyncProcessor;
  let syncQueue: ReturnType<typeof makeSyncQueue>;
  let findAllSpy: jest.SpyInstance;
  let cronJobFindOneSpy: jest.SpyInstance;

  async function buildModule() {
    syncQueue = makeSyncQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryFailedEncounterSyncProcessor,
        { provide: getQueueToken(SyncQueue), useValue: syncQueue },
      ],
    }).compile();

    processor = module.get(RetryFailedEncounterSyncProcessor);
  }

  beforeEach(async () => {
    await buildModule();
    cronJobFindOneSpy = jest
      .spyOn(CronJob, "findOne")
      .mockResolvedValue(makeCronJob() as any);
    findAllSpy = jest
      .spyOn(EncounterCompetition, "findAll")
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("retryFailedEncounters", () => {
    it("throws when CronJob not found", async () => {
      cronJobFindOneSpy.mockResolvedValue(null);

      const job = makeJob();
      await expect(processor.retryFailedEncounters(job as any)).rejects.toThrow(
        "CronJob not found"
      );
    });

    it("returns early when CronJob already running", async () => {
      cronJobFindOneSpy.mockResolvedValue(
        makeCronJob({ running: true, amount: 1 }) as any
      );

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(findAllSpy).not.toHaveBeenCalled();
    });

    it("does nothing when no failed encounters found", async () => {
      findAllSpy.mockResolvedValue([]);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("queues EnterScores jobs for failed encounters", async () => {
      const encounters = [
        makeEncounter({ id: "enc-1", visualCode: "VC001" }),
        makeEncounter({ id: "enc-2", visualCode: "VC002" }),
      ];
      findAllSpy.mockResolvedValue(encounters as any);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(syncQueue.add).toHaveBeenCalledTimes(2);
      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        { encounterId: "enc-1" },
        expect.objectContaining({
          jobId: "enter-scores-enc-1",
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        })
      );
      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        { encounterId: "enc-2" },
        expect.objectContaining({
          jobId: "enter-scores-enc-2",
        })
      );
    });

    it("skips encounters that already have an EnterScores job queued", async () => {
      const encounters = [makeEncounter({ id: "enc-1", visualCode: "VC001" })];
      findAllSpy.mockResolvedValue(encounters as any);

      // Simulate an existing EnterScores job for enc-1
      syncQueue.getJobs.mockResolvedValue([
        { name: Sync.EnterScores, data: { encounterId: "enc-1" } },
      ]);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("queues some and skips others when mixed", async () => {
      const encounters = [
        makeEncounter({ id: "enc-1", visualCode: "VC001" }),
        makeEncounter({ id: "enc-2", visualCode: "VC002" }),
      ];
      findAllSpy.mockResolvedValue(encounters as any);

      // enc-1 already queued, enc-2 is not
      syncQueue.getJobs.mockResolvedValue([
        { name: Sync.EnterScores, data: { encounterId: "enc-1" } },
      ]);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(syncQueue.add).toHaveBeenCalledTimes(1);
      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        { encounterId: "enc-2" },
        expect.any(Object)
      );
    });

    it("increments and decrements CronJob amount", async () => {
      const cronJob = makeCronJob({ amount: 0 });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);
      findAllSpy.mockResolvedValue([]);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      // save called twice: once for amount++ at start, once for amount-- in finally
      expect(cronJob.save).toHaveBeenCalledTimes(2);
      expect(cronJob.amount).toBe(0);
    });

    it("decrements CronJob amount even on error", async () => {
      const cronJob = makeCronJob({ amount: 0 });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);
      findAllSpy.mockRejectedValue(new Error("DB error"));

      const job = makeJob();
      await expect(
        processor.retryFailedEncounters(job as any)
      ).rejects.toThrow("DB error");

      // amount should still be decremented in finally
      expect(cronJob.amount).toBe(0);
      expect(cronJob.save).toHaveBeenCalledTimes(2);
    });

    it("sets lastRun on CronJob in finally block", async () => {
      const cronJob = makeCronJob({ lastRun: null });
      cronJobFindOneSpy.mockResolvedValue(cronJob as any);
      findAllSpy.mockResolvedValue([]);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(cronJob.lastRun).toBeInstanceOf(Date);
    });

    it("uses exponential backoff config for queued jobs", async () => {
      const encounters = [makeEncounter({ id: "enc-1" })];
      findAllSpy.mockResolvedValue(encounters as any);

      const job = makeJob();
      await processor.retryFailedEncounters(job as any);

      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        expect.any(Object),
        expect.objectContaining({
          backoff: { type: "exponential", delay: 60000 },
        })
      );
    });
  });
});
