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

    if (dbCron.running) {
      // When restarting, a job can't be running
      dbCron.running = false;
      dbCron.save();
    }

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
    return this.dbCron.save();
  }

  abstract run(args?: { force?: boolean } & { [key: string]: unknown }): Promise<void>;

  async postRun() {
    logger.info(`Cron job ${this.dbCron.type} finished`);
    this.dbCron.lastRun = new Date();
    this.dbCron.running = false;
    return this.dbCron.save();
  }

  async start() {
    logger.info(`Starting cron job ${this.dbCron.type} on cron ${this.dbCron.cron}`);
    this._cronJob.start();
    this.dbCron.scheduled = true;
    await this.dbCron.save();
  }

  single(args?: { force?: boolean } & { [key: string]: unknown }) {
    if (this.dbCron.running && (args?.force ?? false) === false) {
      logger.info(`Cron job ${this.dbCron.type} is already running`);
      throw new Error(`Cron job ${this.dbCron.type} is already running`);
    }

    return new Promise(async () => {
      try {
        await this.preRun();
        await this.run(args);
      } catch (error) {
        logger.error('Cron failed', error);
      } finally {
        logger.debug('Cron finaly');

        try {
          await this.postRun();
        } catch (error) {
          logger.error("Couln't run post run", error);
        }
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
