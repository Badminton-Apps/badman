import { Player } from "@badman/backend-database";
import { RankingQueue, SyncQueue } from "@badman/backend-queue";
import { getQueueToken } from "@nestjs/bull";
import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLError } from "graphql";
import { ErrorCode } from "../../utils/error-codes";
import { QueueResolver } from "./queue.resolver";

type MockQueue = {
  getWaitingCount: jest.Mock;
  getActiveCount: jest.Mock;
  getCompletedCount: jest.Mock;
  getFailedCount: jest.Mock;
  getDelayedCount: jest.Mock;
  getFailed: jest.Mock;
  getActive: jest.Mock;
  getWaiting: jest.Mock;
  getJob: jest.Mock;
};

const buildQueue = (counts = 0): MockQueue => ({
  getWaitingCount: jest.fn().mockResolvedValue(counts),
  getActiveCount: jest.fn().mockResolvedValue(counts),
  getCompletedCount: jest.fn().mockResolvedValue(counts),
  getFailedCount: jest.fn().mockResolvedValue(counts),
  getDelayedCount: jest.fn().mockResolvedValue(counts),
  getFailed: jest.fn().mockResolvedValue([]),
  getActive: jest.fn().mockResolvedValue([]),
  getWaiting: jest.fn().mockResolvedValue([]),
  getJob: jest.fn().mockResolvedValue(null),
});

const buildUser = (allowed: boolean) =>
  ({
    id: "user-uuid",
    hasAnyPermission: jest.fn().mockResolvedValue(allowed),
  }) as unknown as Player;

describe("QueueResolver", () => {
  let resolver: QueueResolver;
  let syncQueue: MockQueue;
  let rankingQueue: MockQueue;

  beforeEach(async () => {
    syncQueue = buildQueue(1);
    rankingQueue = buildQueue(2);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueResolver,
        { provide: getQueueToken(SyncQueue), useValue: syncQueue },
        { provide: getQueueToken(RankingQueue), useValue: rankingQueue },
      ],
    }).compile();

    resolver = module.get<QueueResolver>(QueueResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("queueStats (query)", () => {
    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      await expect(resolver.queueStats(buildUser(false))).rejects.toThrow(UnauthorizedException);
      expect(syncQueue.getWaitingCount).not.toHaveBeenCalled();
    });

    it("aggregates counters for both queues", async () => {
      const result = await resolver.queueStats(buildUser(true));

      expect(result).toEqual([
        { name: "sync", waiting: 1, active: 1, completed: 1, failed: 1, delayed: 1 },
        { name: "ranking", waiting: 2, active: 2, completed: 2, failed: 2, delayed: 2 },
      ]);
    });
  });

  describe("queueJobs (query)", () => {
    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      await expect(resolver.queueJobs(buildUser(false), "sync", "failed", 50)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("maps bull jobs onto the transport shape", async () => {
      syncQueue.getFailed.mockResolvedValue([
        {
          id: 42,
          name: "SyncEvents",
          data: { id: "abc" },
          failedReason: "boom",
          attemptsMade: 2,
          opts: { attempts: 3 },
          processedOn: 1_700_000_000_000,
          finishedOn: 1_700_000_060_000,
        },
      ]);

      const [job] = await resolver.queueJobs(buildUser(true), "sync", "failed", 50);

      expect(job).toEqual({
        id: "42",
        queue: "sync",
        name: "SyncEvents",
        state: "failed",
        data: JSON.stringify({ id: "abc" }),
        failedReason: "boom",
        attemptsMade: 2,
        attemptsTotal: 3,
        processedOn: new Date(1_700_000_000_000),
        finishedOn: new Date(1_700_000_060_000),
      });
    });

    it("defaults attemptsTotal to 1 when the job carries no attempts option", async () => {
      syncQueue.getWaiting.mockResolvedValue([{ id: 1, name: "SyncEvents", opts: {} }]);

      const [job] = await resolver.queueJobs(buildUser(true), "sync", "waiting", 50);

      expect(job.attemptsTotal).toBe(1);
      expect(job.attemptsMade).toBe(0);
    });

    it("converts limit into an inclusive bull range and caps it", async () => {
      await resolver.queueJobs(buildUser(true), "sync", "active", 10);
      expect(syncQueue.getActive).toHaveBeenCalledWith(0, 9);

      await resolver.queueJobs(buildUser(true), "sync", "active", 5000);
      expect(syncQueue.getActive).toHaveBeenLastCalledWith(0, 199);
    });

    it("rejects an unknown queue with BAD_USER_INPUT", async () => {
      expect.assertions(2);
      try {
        await resolver.queueJobs(buildUser(true), "nope", "failed", 50);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(ErrorCode.BAD_USER_INPUT);
      }
    });

    it("rejects an unknown state with BAD_USER_INPUT", async () => {
      expect.assertions(2);
      try {
        await resolver.queueJobs(buildUser(true), "sync", "completed", 50);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(ErrorCode.BAD_USER_INPUT);
      }
    });
  });

  describe("retryQueueJob (mutation)", () => {
    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      await expect(resolver.retryQueueJob(buildUser(false), "sync", "1")).rejects.toThrow(
        UnauthorizedException
      );
      expect(syncQueue.getJob).not.toHaveBeenCalled();
    });

    it("rejects a job that no longer exists with QUEUE_JOB_NOT_FOUND", async () => {
      syncQueue.getJob.mockResolvedValue(null);

      expect.assertions(2);
      try {
        await resolver.retryQueueJob(buildUser(true), "sync", "missing");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(ErrorCode.QUEUE_JOB_NOT_FOUND);
      }
    });

    it("rejects a job that is not failed with INVALID_STATE", async () => {
      const retry = jest.fn();
      syncQueue.getJob.mockResolvedValue({
        id: 7,
        name: "SyncEvents",
        opts: {},
        getState: jest.fn().mockResolvedValue("active"),
        retry,
      });

      expect.assertions(3);
      try {
        await resolver.retryQueueJob(buildUser(true), "sync", "7");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(ErrorCode.INVALID_STATE);
      }
      expect(retry).not.toHaveBeenCalled();
    });

    it("retries a failed job and reports it as waiting", async () => {
      const retry = jest.fn().mockResolvedValue(undefined);
      syncQueue.getJob.mockResolvedValue({
        id: 7,
        name: "SyncEvents",
        data: { id: "abc" },
        failedReason: "boom",
        attemptsMade: 3,
        opts: { attempts: 3 },
        getState: jest.fn().mockResolvedValue("failed"),
        retry,
      });

      const result = await resolver.retryQueueJob(buildUser(true), "sync", "7");

      expect(retry).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("7");
      expect(result.state).toBe("waiting");
      expect(result.queue).toBe("sync");
    });

    it("resolves the job from the queue that was named", async () => {
      rankingQueue.getJob.mockResolvedValue({
        id: 9,
        name: "UpdateRanking",
        opts: {},
        getState: jest.fn().mockResolvedValue("failed"),
        retry: jest.fn().mockResolvedValue(undefined),
      });

      const result = await resolver.retryQueueJob(buildUser(true), "ranking", "9");

      expect(result.queue).toBe("ranking");
      expect(syncQueue.getJob).not.toHaveBeenCalled();
    });
  });
});
