import { logger } from '@badvlasim/shared';
import { Transaction } from 'sequelize';
import { Logger } from 'winston';
export class StepProcessor {
  protected readonly transaction?: Transaction;
  protected readonly logger?: Logger;
  protected readonly lastRun?: Date;

  constructor(options?: StepOptions) {
    this.transaction = options?.transaction;
    this.logger = options?.logger ?? logger;
    this.lastRun = options?.lastRun;
  }
}

export interface StepOptions {
  lastRun?: Date;
  transaction?: Transaction;
  logger?: Logger;
}
