import { Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
export class StepProcessor {
  protected readonly transaction?: Transaction;
  protected readonly logger!: Logger;
  protected readonly lastRun?: Date;

  constructor(options?: StepOptions) {
    this.transaction = options?.transaction;
    this.logger = options?.logger ?? new Logger();
    this.lastRun = options?.lastRun;
  }
}

export interface StepOptions {
  lastRun?: Date;
  transaction?: Transaction;
  logger?: Logger;
}
