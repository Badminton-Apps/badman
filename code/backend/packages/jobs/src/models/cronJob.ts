import { Cron, logger } from '@badvlasim/shared';
import { schedule, ScheduledTask } from 'node-cron';

export abstract class CronJob {
  private _cronJob: ScheduledTask;

  constructor(public dbCron: Cron) {
    logger.info(
      `Adding cron job ${dbCron.type} (${dbCron.cron}), state: ${
        dbCron.scheduled ? 'running' : 'stopped'
      }`
    );

    this._cronJob = schedule(
      this.dbCron.cron,
      () => {
        this.single();
      },
      { scheduled: dbCron.scheduled ?? false }
    );
  }

  async preRun() {
    // override in subclasses
    logger.info(`Cron job ${this.dbCron.type} is running`);
    this.dbCron.running = true;
    this.dbCron.save();
  }

  abstract run(args?: any): Promise<void>;

  async postRun() {
    this.dbCron.lastRun = new Date();
    this.dbCron.running = false;
    await this.dbCron.save();
    logger.info(`Cron job ${this.dbCron.type} finished`);
  }

  async start() {
    logger.info(`Starting cron job ${this.dbCron.type} on cron ${this.dbCron.cron}`);
    this._cronJob.start();
    this.dbCron.scheduled = true;
    await this.dbCron.save();
  } 

  single(args?: any) {
    if (this.dbCron.running && (args?.force ?? false) == false) {
      logger.info(`Cron job ${this.dbCron.type} is already running`);
      throw `Cron job ${this.dbCron.type} is already running`;
    }

    return new Promise(async _ => {
      try {
        await this.preRun();
        await this.run(args);
      } catch (error) {
        logger.error('Cron failed', error);
      } finally {
        await this.postRun();
      }
    });
  }

  async stop() {
    logger.info(`Stopped cron job ${this.dbCron.type}`);
    this.dbCron.scheduled = false;
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
