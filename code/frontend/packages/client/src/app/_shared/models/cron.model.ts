export class Cron {
  id?: string;
  cron?: string;
  type?: string;
  lastRun?: Date;
  running?: boolean;
  scheduled?: boolean;
  meta?: any;

  constructor(args?: Partial<Cron>) {
    this.id = args?.id;
    this.cron = args?.cron;
    this.type = args?.type;
    this.lastRun = args?.lastRun;
    this.running = args?.running;
    this.scheduled = args?.scheduled;
    this.meta = args?.meta;
  }
}
