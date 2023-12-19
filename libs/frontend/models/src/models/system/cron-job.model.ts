export class CronJob {
  id?: string;
  name?: string;
  cronTime?: string;
  meta?: QueueCronJob;
  lastRun?: Date;
  running?: boolean;

  constructor(args: Partial<CronJob>) {
    this.id = args?.id;
    this.name = args?.name;
    this.cronTime = args?.cronTime;
    this.meta = args?.meta;
    this.lastRun = args?.lastRun;
    this.running = args?.running;
  }
}

export interface QueueCronJob {
  jobName: string;
  queueName: string;
  arguments: string;
}
