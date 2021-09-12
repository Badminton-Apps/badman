import { Cron, logger } from '@badvlasim/shared';
import { schedule, ScheduledTask } from 'node-cron';

export abstract class CronJob {
  private _cronJob: ScheduledTask;

  constructor(public dbCron: Cron) {
    this._cronJob = schedule(
      this.dbCron.cron,
      () => {
        this.preRun();
        this.run();
        this.postRun();
      },
      { scheduled: dbCron.running ?? false }
    );
  }

  async preRun() {
    // override in subclasses
    logger.info(`Cron job ${this.dbCron.type} is running`);
  }

  abstract run(): Promise<void>;

  async postRun() {
    this.dbCron.lastRun = new Date();
    await this.dbCron.save();
    logger.info(`Cron job ${this.dbCron.type} finished`);
  }

  async start() {
    this._cronJob.start();
    this.dbCron.running = true;
    await this.dbCron.save();
  }

  async single(){
    this.run();
  }

  async stop() {
    this.dbCron.running = false;
    await this.dbCron.save();
    this._cronJob.stop();
  }

  static dbEntry(): {
    cron: string;
    type: string;
  } {
    throw new Error('Please implement this in your sub class');
  }
}
