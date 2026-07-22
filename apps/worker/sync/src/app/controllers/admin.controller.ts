import { Sync, SyncQueue } from "@badman/backend-queue";
import { InjectQueue } from "@nestjs/bull";
import { Body, Controller, Get, Param, Post, Logger } from "@nestjs/common";
import { Queue } from "bull";

@Controller("admin/jobs")
export class AdminJobsController {
  private readonly logger = new Logger(AdminJobsController.name);

  constructor(@InjectQueue(SyncQueue) private readonly queue: Queue) {}

  @Get("failed")
  async getFailedJobs() {
    const jobs = await this.queue.getFailed(0, 100);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      attemptsTotal: job.opts?.attempts ?? 1,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
    }));
  }

  @Get("active")
  async getActiveJobs() {
    const jobs = await this.queue.getActive(0, 50);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
    }));
  }

  @Get("waiting")
  async getWaitingJobs() {
    const jobs = await this.queue.getWaiting(0, 50);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
    }));
  }

  @Get("stats")
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  @Post("trigger/sync-events")
  async triggerSyncEvents(
    @Body()
    body: {
      id?: string | string[];
      search?: string;
      date?: string;
      startDate?: string;
      skip?: string[];
      only?: string[];
      official?: boolean;
      offset?: number;
      limit?: number;
      userId?: string | string[];
    } = {}
  ) {
    const job = await this.queue.add(Sync.SyncEvents, body, {
      removeOnComplete: 5,
      removeOnFail: 5,
      attempts: 1,
    });
    this.logger.log(`Triggered SyncEvents job ${job.id} with data: ${JSON.stringify(body)}`);
    return { success: true, jobId: job.id, name: job.name, data: body };
  }

  @Post(":id/retry")
  async retryJob(@Param("id") jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return { success: false, error: `Job ${jobId} not found` };
    }

    const state = await job.getState();
    if (state !== "failed") {
      return { success: false, error: `Job ${jobId} is in state '${state}', not 'failed'` };
    }

    await job.retry();
    this.logger.log(`Retried job ${jobId} (${job.name})`);

    return { success: true, jobId, name: job.name };
  }
}
