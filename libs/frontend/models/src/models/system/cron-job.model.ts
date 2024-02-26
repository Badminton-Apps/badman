import moment from 'moment';
import { Moment } from 'moment';

export class CronJob {
  id?: string;
  name?: string;
  cronTime?: string;
  meta?: QueueCronJob;
  type?: 'sync' | 'ranking';
  lastRun?: Moment;
  nextRun?: Moment;
  running?: boolean;

  constructor(args: Partial<CronJob>) {
    this.id = args?.id;
    this.name = args?.name;
    this.cronTime = args?.cronTime;
    this.meta = {
      ...(args?.meta ?? {}),
      arguments: JSON.parse((args.meta?.arguments as string) ?? '{}'),
    } as QueueCronJob;

    this.running = args?.running;
    this.type = args?.type;

    const parsed = moment(args?.lastRun);
    this.lastRun = parsed.isValid() ? parsed : undefined;

    const next = moment(args?.nextRun);
    this.nextRun = next.isValid() ? next : undefined;
  }
}

export interface QueueCronJob {
  jobName: string;
  queueName: string;
  arguments: unknown;
}
