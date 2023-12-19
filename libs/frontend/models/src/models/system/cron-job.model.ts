import moment from 'moment';
import { Moment } from 'moment';

export class CronJob {
  id?: string;
  name?: string;
  cronTime?: string;
  meta?: QueueCronJob;
  lastRun?: Moment;
  running?: boolean;

  constructor(args: Partial<CronJob>) {
    this.id = args?.id;
    this.name = args?.name;
    this.cronTime = args?.cronTime;
    this.meta = args?.meta;
    const parsed = moment(args?.lastRun);
    this.lastRun = parsed.isValid() ? parsed : undefined;
    this.running = args?.running;
  }
}

export interface QueueCronJob {
  jobName: string;
  queueName: string;
  arguments: string;
}
