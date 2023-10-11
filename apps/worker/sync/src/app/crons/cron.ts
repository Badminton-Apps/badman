import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { parseExpression } from 'cron-parser';
import moment from 'moment';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(@InjectQueue(SyncQueue) syncQ: Queue) {
    // remove all scheduled jobs from queue
    this.logger.log('Clearing sync queue');
    syncQ.empty().then(() => {
      // Schedule new jobs
      this._scheduleJob(syncQ, Sync.SyncEvents, '15 */4 * * *');
      this._scheduleJob(syncQ, Sync.SyncRanking, '0 18 * * *');
      this._scheduleJob(syncQ, Sync.CheckEncounters, '30 */4 * * *');
    });
  }

  private _scheduleJob(
    queue: Queue,
    jobName: Sync,
    cron: string,
    data: unknown = null
  ) {
    // Getting next interval
    const interval = parseExpression(cron);
    const next = interval.next().getTime() - Date.now();
    const readable = moment(next).format('HH:mm:ss');

    // Scheduling job
    this.logger.verbose(`Scheduling ${jobName} in ${readable}`);
    return queue.add(jobName, data, {
      removeOnFail: 1,
      delay: next,
      repeat: {
        cron: cron,
        tz: 'Europe/Brussels',
      },
      jobId: jobName,
    });
  }
}
