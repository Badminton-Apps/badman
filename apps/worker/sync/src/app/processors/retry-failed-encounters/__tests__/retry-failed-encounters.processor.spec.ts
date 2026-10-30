import { Op, Sequelize } from "sequelize";
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
    getJob: jest.fn().mockResolvedValue(null),
    getFailed: jest.fn().mockResolvedValue([]),
  };
}

function makeQueueJob(
  state: string,
  overrides: { name?: string; encounterId?: string; failedReason?: string } = {}
) {
  return {
    name: overrides.name ?? Sync.EnterScores,
    data: { encounterId: overrides.encounterId ?? "enc-1" },
    failedReason: overrides.failedReason,
    getState: jest.fn().mockResolvedValue(state),
    retry: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function withSeason(id: string, season: number) {
  return {
    id,
    drawCompetition: { subEventCompetition: { eventCompetition: { season } } },
  };
}

function atDate(date: string) {
  jest
    .useFakeTimers({
      doNotFake: [
        "nextTick",
        "setImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
      ],
    })
    .setSystemTime(new Date(date));
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
    cronJobFindOneSpy = jest.spyOn(CronJob, "findOne").mockResolvedValue(makeCronJob() as any);
    findAllSpy = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([]);
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
      cronJobFindOneSpy.mockResolvedValue(makeCronJob({ running: true, amount: 1 }) as any);

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

    it("only selects encounters from seasons that are still open", async () => {
      atDate("2026-09-08T09:00:00");
      try {
        await processor.retryFailedEncounters(makeJob() as any);
      } finally {
        jest.useRealTimers();
      }

      const [query] = findAllSpy.mock.calls[0];
      const eventInclude = query.include[0].include[0].include[0];
      expect(eventInclude.where).toEqual({ season: { [Op.gte]: 2026 } });
      expect(query.where.date).toEqual({ [Op.lt]: new Date("2026-09-08T09:00:00") });
    });

    it("only selects encounters that have a visual code and were entered", async () => {
      await processor.retryFailedEncounters(makeJob() as any);

      const [query] = findAllSpy.mock.calls[0];
      const queryGenerator = new Sequelize({ dialect: "postgres" }).getQueryInterface()
        .queryGenerator as unknown as { whereQuery: (where: unknown) => string };
      const sql = queryGenerator.whereQuery(query.where);
      expect(sql).toMatch(/"visualCode" IS NOT NULL/);
      expect(sql).toMatch(/"enteredOn" IS NOT NULL/);
      expect(sql).not.toMatch(/!= NULL/);
    });

    it.each(["active", "waiting", "delayed"])(
      "skips an encounter whose EnterScores job is still %s",
      async (state) => {
        findAllSpy.mockResolvedValue([makeEncounter({ id: "enc-1" })] as any);
        const pending = makeQueueJob(state);
        syncQueue.getJob.mockResolvedValue(pending);

        await processor.retryFailedEncounters(makeJob() as any);

        expect(syncQueue.getJob).toHaveBeenCalledWith("enter-scores-enc-1");
        expect(syncQueue.add).not.toHaveBeenCalled();
        expect(pending.retry).not.toHaveBeenCalled();
      }
    );

    it("retries a failed EnterScores job, since add() is ignored for an existing job id", async () => {
      findAllSpy.mockResolvedValue([makeEncounter({ id: "enc-1" })] as any);
      const failed = makeQueueJob("failed", { failedReason: "[SAVE_FAILED] Save did not stick" });
      syncQueue.getJob.mockResolvedValue(failed);

      await processor.retryFailedEncounters(makeJob() as any);

      expect(failed.retry).toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("leaves a push that was skipped because toernooi.nl already has a result", async () => {
      findAllSpy.mockResolvedValue([makeEncounter({ id: "enc-1" })] as any);
      const skipped = makeQueueJob("failed", { failedReason: "[RESULT_ALREADY_PRESENT] skipped" });
      syncQueue.getJob.mockResolvedValue(skipped);

      await processor.retryFailedEncounters(makeJob() as any);

      expect(skipped.retry).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it("retries a season-closed push once its season is open again after a correction", async () => {
      findAllSpy.mockResolvedValue([makeEncounter({ id: "enc-1" })] as any);
      const corrected = makeQueueJob("failed", { failedReason: "[SEASON_CLOSED] season 2000" });
      syncQueue.getJob.mockResolvedValue(corrected);

      await processor.retryFailedEncounters(makeJob() as any);

      expect(corrected.retry).toHaveBeenCalled();
    });

    it("queues, retries and skips per encounter when mixed", async () => {
      findAllSpy.mockResolvedValue([
        makeEncounter({ id: "enc-1", visualCode: "VC001" }),
        makeEncounter({ id: "enc-2", visualCode: "VC002" }),
        makeEncounter({ id: "enc-3", visualCode: "VC003" }),
      ] as any);
      const waiting = makeQueueJob("waiting", { encounterId: "enc-1" });
      const failed = makeQueueJob("failed", { encounterId: "enc-3", failedReason: "boom" });
      syncQueue.getJob.mockImplementation(async (id: string) =>
        id === "enter-scores-enc-1" ? waiting : id === "enter-scores-enc-3" ? failed : null
      );

      await processor.retryFailedEncounters(makeJob() as any);

      expect(syncQueue.add).toHaveBeenCalledTimes(1);
      expect(syncQueue.add).toHaveBeenCalledWith(
        Sync.EnterScores,
        { encounterId: "enc-2" },
        expect.any(Object)
      );
      expect(failed.retry).toHaveBeenCalled();
      expect(waiting.retry).not.toHaveBeenCalled();
    });

    describe("failed jobs of closed seasons", () => {
      it("removes failed EnterScores jobs whose season has closed or whose encounter is gone", async () => {
        const closed = makeQueueJob("failed", { encounterId: "enc-old" });
        const open = makeQueueJob("failed", { encounterId: "enc-open" });
        const gone = makeQueueJob("failed", { encounterId: "enc-gone" });
        const otherJob = makeQueueJob("failed", { name: "SyncEvents", encounterId: "enc-old" });
        syncQueue.getFailed.mockResolvedValue([closed, open, gone, otherJob]);
        findAllSpy.mockImplementation(async (query: any) =>
          query.where?.id ? [withSeason("enc-old", 2025), withSeason("enc-open", 2026)] : []
        );

        atDate("2026-09-08T09:00:00");
        try {
          await processor.retryFailedEncounters(makeJob() as any);
        } finally {
          jest.useRealTimers();
        }

        expect(findAllSpy).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: ["enc-old", "enc-open", "enc-gone"] } })
        );
        expect(closed.remove).toHaveBeenCalled();
        expect(gone.remove).toHaveBeenCalled();
        expect(open.remove).not.toHaveBeenCalled();
        expect(otherJob.remove).not.toHaveBeenCalled();
      });

      it("keeps a season open until 1 July of the following year", async () => {
        const job2025 = makeQueueJob("failed", { encounterId: "enc-2025" });
        syncQueue.getFailed.mockResolvedValue([job2025]);
        findAllSpy.mockImplementation(async (query: any) =>
          query.where?.id ? [withSeason("enc-2025", 2025)] : []
        );

        atDate("2026-06-30T09:00:00");
        try {
          await processor.retryFailedEncounters(makeJob() as any);
        } finally {
          jest.useRealTimers();
        }

        expect(job2025.remove).not.toHaveBeenCalled();
      });

      it("does not query encounters when there are no failed EnterScores jobs", async () => {
        syncQueue.getFailed.mockResolvedValue([makeQueueJob("failed", { name: "SyncEvents" })]);

        await processor.retryFailedEncounters(makeJob() as any);

        expect(findAllSpy).toHaveBeenCalledTimes(1);
      });
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
      await expect(processor.retryFailedEncounters(job as any)).rejects.toThrow("DB error");

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
