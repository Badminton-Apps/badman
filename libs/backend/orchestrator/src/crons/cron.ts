import { CronJob, RankingSystem } from '@badman/backend-database';
import {
  RankingQueue,
  SyncQueue,
  UpdateRankingJob,
} from '@badman/backend-queue';
import { ConfigType, getRankingPeriods } from '@badman/utils';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bull';
import { CronJob as Job } from 'cron';
import moment from 'moment';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectQueue(SyncQueue) private readonly syncQ: Queue,
    @InjectQueue(RankingQueue) private readonly rankQ: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    readonly configSerive: ConfigService<ConfigType>,
  ) {}

  async onModuleInit() {
    await this.queueSystems();
    await this.queueCrons();

    this._getCrons();
  }

  async queueCrons() {
    const syncJobs = await CronJob.findAll({
      where: {
        type: 'sync',
      },
    });
    for (const job of syncJobs) {
      this._queueSyncJob(job);
    }
  }

  async queueSystems() {
    const rankingJobs = await CronJob.findAll({
      where: {
        type: 'ranking',
      },
    });
    await this._queueJobsForSystems(rankingJobs);
    for (const job of rankingJobs) {
      this._queueRankingJob(job);
    }
  }

  private _getQueue(queueName: string) {
    switch (queueName) {
      case SyncQueue:
        return this.syncQ;
      case RankingQueue:
        return this.rankQ;
      default:
        throw new Error(`Queue ${queueName} not found`);
    }
  }
  private _getCrons() {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key) => {
      let next;
      try {
        next = value.nextDates(1);
      } catch (e) {
        next = 'error: next fire date is in the past!';
      }
      this.logger.debug(`job: ${key} -> next: ${next}`);
    });
  }

  private _queueSyncJob(job: CronJob) {
    if (!job.meta?.queueName) {
      throw new Error(`Queue name not found for job ${job.name}`);
    }

    const j = Job.from({
      cronTime: job.cronTime,
      onTick: async () => {
        this.logger.verbose(`Queueing ${job.name}`);
        const queue = this._getQueue(job.meta!.queueName);

        // if the job is already running, don't queue it again
        const runningJobs = await queue.getJobs(['active', 'waiting']);
        const running = runningJobs.find((j) => j.name === job.meta!.jobName);
        if (running) {
          this.logger.verbose(`Job ${job.name} already running`);
          return;
        }

        queue.add(job.meta!.jobName, job.meta?.arguments, {
          removeOnFail: 5,
          removeOnComplete: 5,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(job.name, j);
    j.start();

    this.logger.verbose(`Cron ${job.name} scheduled at ${job.cronTime}`);
  }

  private async _queueJobsForSystems(jobs: CronJob[]) {
    const systems = await RankingSystem.findAll({
      where: {
        calculateUpdates: true,
      },
    });

    // find or create jobs for each system
    for (const system of systems) {
      const jobName = `Update Ranking ${system.name}`;
      const job = jobs.find((j) => j.name === jobName);
      const cronTime = '0 0 * * *';

      if (job) {
        job.cronTime = cronTime;
        await job.save();
        continue;
      }

      const newJob = await CronJob.create({
        name: jobName,
        cronTime,
        running: false,
        type: 'ranking',
        meta: {
          queueName: RankingQueue,
          jobName: 'UpdateRanking',
          arguments: {
            systemId: system.id,
            // the points are calculated when running sync
            calculatePoints: false,
            recalculatePoints: false,
          } as UpdateRankingJob,
        },
      });

      jobs.push(newJob);
    }

    this.logger.verbose(`Removing old jobs`);

    // remove jobs starting with name 'Update Ranking" for systems that are not in the database anymore
    const jobNames = jobs
      .map((j) => j.name)
      .filter((j) => j.startsWith('Update Ranking'));
    const systemNames = systems.map((s) => `Update Ranking ${s.name}`);

    const toRemove = jobNames.filter((j) => !systemNames.includes(j));

    for (const job of toRemove) {
      this.logger.verbose(`Removing job ${job}`);
      await CronJob.destroy({
        where: {
          name: job,
        },
      });
    }
  }

  private _queueRankingJob(job: CronJob) {
    if (!job.meta?.queueName) {
      throw new Error(`Queue name not found for job ${job.name}`);
    }

    const j = Job.from({
      cronTime: job.cronTime,
      onTick: async () => {
        this.logger.verbose(`Queueing ${job.name}`);

        const system = await RankingSystem.findByPk(
          (job.meta!.arguments as unknown as { systemId: string }).systemId,
        );

        if (!system) {
          throw new Error(`System not found`);
        }

        const hasUpdates =
          getRankingPeriods(
            system,
            // calculation is always updated when the update is run, so we can check since the last update
            moment(system.calculationLastUpdate),
            moment(),
          ).length > 0;

        if (!hasUpdates) {
          this.logger.verbose(`No updates for ${job.name} on ${moment()}`);
          return;
        }

        const queue = this._getQueue(job.meta!.queueName);

        // if the job is already running, don't queue it again
        const runningJobs = await queue.getJobs(['active', 'waiting']);
        const running = runningJobs.find((j) => j.name === job.meta!.jobName);
        if (running) {
          this.logger.verbose(`Job ${job.name} already running`);
          return;
        }

        queue.add(job.meta!.jobName, job.meta?.arguments, {
          removeOnFail: 5,
          removeOnComplete: 5,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(job.name, j);
    j.start();

    this.logger.verbose(`Cron ${job.name} scheduled at ${job.cronTime}`);
  }
}
