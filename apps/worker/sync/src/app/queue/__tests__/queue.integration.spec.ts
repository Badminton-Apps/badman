import Bull, { Queue } from "bull";
import { RedisMemoryServer } from "redis-memory-server";

/**
 * Phase 3: Queue integration tests using real Bull + in-memory Redis.
 *
 * These tests verify queue infrastructure behavior independently of processor
 * business logic: job lifecycle, retries, concurrency, rate limiting.
 *
 * A minimal no-op processor is registered for each test rather than the real
 * processors, so we can control success/failure precisely.
 */

const QUEUE_NAME = "sync-test";
const JOB_TIMEOUT = 10_000; // per test

/**
 * Wait for a job to reach a terminal state (completed or failed after all retries).
 * Uses Bull's job.finished() which resolves on completion or rejects on final failure.
 */
async function waitForTerminal(
  queue: Queue,
  jobId: string | number,
  timeout = 5000
): Promise<void> {
  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  return Promise.race([
    job.finished().then(() => {}).catch(() => {}),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out waiting for job ${jobId}`)), timeout)
    ),
  ]);
}

async function waitForEvent(
  queue: Queue,
  event: "completed" | "failed",
  jobId: string | number,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for '${event}' on job ${jobId}`)),
      timeout
    );

    queue.on(event, (job) => {
      if (String(job.id) === String(jobId)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

describe("Bull queue integration (Phase 3)", () => {
  let redisServer: RedisMemoryServer;
  let redisPort: number;
  let queue: Queue;

  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisPort = await redisServer.getPort();
  }, 30_000);

  afterAll(async () => {
    // Give any lingering connections a moment to close before stopping Redis
    await new Promise((r) => setTimeout(r, 200));
    await redisServer.stop();
  }, 10_000);

  beforeEach(async () => {
    queue = new Bull(QUEUE_NAME, {
      redis: { host: "127.0.0.1", port: redisPort },
    });

    // Drain queue between tests
    await queue.empty();
  });

  afterEach(async () => {
    await queue.close();
  });

  // ─── 3.1 Job lifecycle ───────────────────────────────────────────────────

  describe("3.1 Job lifecycle", () => {
    it("should complete a job successfully", async () => {
      queue.process(async () => ({ done: true }));

      const job = await queue.add({ payload: "test" });
      await waitForEvent(queue, "completed", job.id, JOB_TIMEOUT);

      const finished = await queue.getJob(job.id);
      expect(await finished?.isCompleted()).toBe(true);
    });

    it("should record return value on completed job", async () => {
      queue.process(async () => ({ result: 42 }));

      const job = await queue.add({});
      await waitForEvent(queue, "completed", job.id, JOB_TIMEOUT);

      const finished = await queue.getJob(job.id);
      expect(finished?.returnvalue).toEqual({ result: 42 });
    });

    it("should mark a job as failed when processor throws", async () => {
      queue.process(async () => {
        throw new Error("processor error");
      });

      const job = await queue.add({}, { attempts: 1 });
      await waitForEvent(queue, "failed", job.id, JOB_TIMEOUT);

      const failed = await queue.getJob(job.id);
      expect(await failed?.isFailed()).toBe(true);
      expect(failed?.failedReason).toContain("processor error");
    });
  });

  // ─── 3.2 Retry behaviour ────────────────────────────────────────────────

  describe("3.2 Retry behaviour", () => {
    it("should retry a job up to the configured attempt count", async () => {
      let calls = 0;

      queue.process(async () => {
        calls++;
        throw new Error("always fail");
      });

      const job = await queue.add({}, { attempts: 3, backoff: { type: "fixed", delay: 10 } });
      await waitForTerminal(queue, job.id, JOB_TIMEOUT);

      expect(calls).toBe(3);
    });

    it("should complete on a later attempt after initial failures", async () => {
      let calls = 0;

      queue.process(async () => {
        calls++;
        if (calls < 3) throw new Error("not yet");
        return { ok: true };
      });

      const job = await queue.add({}, { attempts: 3, backoff: { type: "fixed", delay: 10 } });
      await waitForTerminal(queue, job.id, JOB_TIMEOUT);

      expect(calls).toBe(3);
      const finished = await queue.getJob(job.id);
      expect(finished?.returnvalue).toEqual({ ok: true });
    });

    it("should expose attemptsMade on the job inside the processor", async () => {
      const attemptsSeen: number[] = [];

      queue.process(async (job) => {
        attemptsSeen.push(job.attemptsMade);
        throw new Error("fail");
      });

      const job = await queue.add({}, { attempts: 3, backoff: { type: "fixed", delay: 10 } });
      await waitForTerminal(queue, job.id, JOB_TIMEOUT);

      expect(attemptsSeen).toEqual([0, 1, 2]);
    });
  });

  // ─── 3.3 Concurrency ────────────────────────────────────────────────────

  describe("3.3 Concurrency", () => {
    it("should process only one job at a time with concurrency=1", async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      // Register with explicit concurrency 1
      queue.process(1, async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 50));
        concurrent--;
        return {};
      });

      const jobs = await Promise.all([
        queue.add({ n: 1 }),
        queue.add({ n: 2 }),
        queue.add({ n: 3 }),
      ]);

      await Promise.all(jobs.map((j) => waitForEvent(queue, "completed", j.id, JOB_TIMEOUT)));

      expect(maxConcurrent).toBe(1);
    });
  });

  // ─── 3.4 Job progress ───────────────────────────────────────────────────

  describe("3.4 Job progress", () => {
    it("should track progress updates from inside the processor", async () => {
      const progressValues: number[] = [];

      queue.on("progress", (job, progress) => {
        progressValues.push(progress as number);
      });

      queue.process(async (job) => {
        await job.progress(25);
        await job.progress(50);
        await job.progress(100);
        return {};
      });

      const job = await queue.add({});
      await waitForEvent(queue, "completed", job.id, JOB_TIMEOUT);

      expect(progressValues).toEqual([25, 50, 100]);
    });
  });

  // ─── 3.5 Job data ───────────────────────────────────────────────────────

  describe("3.5 Job data", () => {
    it("should pass job data to the processor", async () => {
      let receivedData: unknown;

      queue.process(async (job) => {
        receivedData = job.data;
        return {};
      });

      const job = await queue.add({ encounterId: "enc-42", type: "EnterScores" });
      await waitForEvent(queue, "completed", job.id, JOB_TIMEOUT);

      expect(receivedData).toEqual({ encounterId: "enc-42", type: "EnterScores" });
    });

    it("should allow adding named jobs", async () => {
      let processedName: string | undefined;

      queue.process("EnterScores", async (job) => {
        processedName = job.name;
        return {};
      });

      const job = await queue.add("EnterScores", { encounterId: "enc-42" });
      await waitForEvent(queue, "completed", job.id, JOB_TIMEOUT);

      expect(processedName).toBe("EnterScores");
    });
  });
});
