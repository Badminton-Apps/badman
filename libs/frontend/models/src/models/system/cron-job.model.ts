export class CronJob {
  id?: string;
  name?: string;
  cronTime?: string;
  meta?: QueueCronJob;
  lastRun?: Date;

  constructor(args: Partial<CronJob>) {
    this.id = args?.id;
    this.name = args?.name;
    this.cronTime = args?.cronTime;
    this.meta = args?.meta;
    this.lastRun = args?.lastRun;
  }
}

export interface QueueCronJob {
  jobName: string;
  queueName: string;
  arguments: string;
}
