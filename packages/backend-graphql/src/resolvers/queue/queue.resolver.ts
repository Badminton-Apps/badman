import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { RankingQueue, SyncQueue } from "@badman/backend-queue";
import { InjectQueue } from "@nestjs/bull";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Job, Queue } from "bull";
import { GraphQLError } from "graphql";
import { ErrorCode } from "../../utils/error-codes";
import { QueueJob, QueueStats } from "./queue.object";

/** Permission required for every operation on this resolver. */
const QUEUE_PERMISSION = "change:job";

/** The states a job can be listed by. Bull knows more, these are the useful ones. */
const LISTABLE_STATES = ["waiting", "active", "failed"] as const;
type ListableState = (typeof LISTABLE_STATES)[number];

@Resolver(() => QueueJob)
export class QueueResolver {
  private readonly logger = new Logger(QueueResolver.name);

  constructor(
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
    @InjectQueue(RankingQueue) private readonly _rankingQueue: Queue
  ) {}

  @Query(() => [QueueStats])
  async queueStats(@User() user: Player): Promise<QueueStats[]> {
    await this._assertPermission(user);

    return Promise.all(this._allQueues().map(([name, queue]) => this._statsFor(name, queue)));
  }

  @Query(() => [QueueJob])
  async queueJobs(
    @User() user: Player,
    @Args("queue", { type: () => String }) queueName: string,
    @Args("state", { type: () => String }) state: string,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 50 }) limit: number
  ): Promise<QueueJob[]> {
    await this._assertPermission(user);

    const queue = this._getQueue(queueName);
    const listableState = this._getState(state);

    // An explicit `null` bypasses the default, and a client can pass 0 or a negative
    // number. Bull's range is inclusive, so clamping to 0 would still return one job.
    if (limit == null || limit <= 0) {
      return [];
    }

    // Bull's range is inclusive on both ends, so `limit` items means `limit - 1`.
    const end = Math.min(limit, 200) - 1;

    const jobs = await this._fetchJobs(queue, listableState, end);
    return jobs.map((job) => this._toQueueJob(job, queueName, listableState));
  }

  @Mutation(() => QueueJob)
  async retryQueueJob(
    @User() user: Player,
    @Args("queue", { type: () => String }) queueName: string,
    @Args("id", { type: () => ID }) id: string
  ): Promise<QueueJob> {
    await this._assertPermission(user);

    const queue = this._getQueue(queueName);
    const job = await queue.getJob(id);

    if (!job) {
      // Bull evicts finished jobs on a small window (removeOnComplete / removeOnFail),
      // so a job disappearing is routine rather than exceptional. Give clients a code
      // they can distinguish from a genuine failure.
      throw new GraphQLError(`Job ${id} not found in queue ${queueName}`, {
        extensions: { code: ErrorCode.QUEUE_JOB_NOT_FOUND, jobId: id, queue: queueName },
      });
    }

    const state = await job.getState();
    if (state !== "failed") {
      throw new GraphQLError(`Job ${id} is in state '${state}', only failed jobs can be retried`, {
        extensions: { code: ErrorCode.INVALID_STATE, jobId: id, queue: queueName, state },
      });
    }

    await job.retry();
    this.logger.log(`Retried job ${id} (${job.name}) on queue ${queueName}`);

    // `job.retry()` moves it back to waiting; report the state it lands in rather
    // than re-reading, which would race with a worker picking it straight up.
    return this._toQueueJob(job, queueName, "waiting");
  }

  private async _assertPermission(user: Player): Promise<void> {
    if (!(await user.hasAnyPermission([QUEUE_PERMISSION]))) {
      throw new UnauthorizedException(`You do not have permission to inspect the queues`);
    }
  }

  private _allQueues(): [string, Queue][] {
    return [
      [SyncQueue, this._syncQueue],
      [RankingQueue, this._rankingQueue],
    ];
  }

  private _getQueue(name: string): Queue {
    const match = this._allQueues().find(([queueName]) => queueName === name);

    if (!match) {
      throw new GraphQLError(`Unknown queue '${name}'`, {
        extensions: {
          code: ErrorCode.BAD_USER_INPUT,
          allowed: this._allQueues().map(([queueName]) => queueName),
        },
      });
    }

    return match[1];
  }

  private _getState(state: string): ListableState {
    if (!LISTABLE_STATES.includes(state as ListableState)) {
      throw new GraphQLError(`Unknown job state '${state}'`, {
        extensions: { code: ErrorCode.BAD_USER_INPUT, allowed: [...LISTABLE_STATES] },
      });
    }

    return state as ListableState;
  }

  private _fetchJobs(queue: Queue, state: ListableState, end: number): Promise<Job[]> {
    switch (state) {
      case "failed":
        return queue.getFailed(0, end);
      case "active":
        return queue.getActive(0, end);
      case "waiting":
        return queue.getWaiting(0, end);
    }
  }

  private async _statsFor(name: string, queue: Queue): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { name, waiting, active, completed, failed, delayed };
  }

  private _toQueueJob(job: Job, queueName: string, state: string): QueueJob {
    return {
      id: `${job.id}`,
      queue: queueName,
      name: job.name,
      state,
      data: job.data === undefined ? undefined : JSON.stringify(job.data),
      failedReason: job.failedReason ?? undefined,
      attemptsMade: job.attemptsMade ?? 0,
      attemptsTotal: job.opts?.attempts ?? 1,
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }
}
