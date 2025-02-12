import { Injectable, Logger } from '@nestjs/common';
import { Job, JobId } from 'bull';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transaction manager service
 *
 * note: this only works when running on a single instance
 * having multiple instances won't share the transaction list
 */
@Injectable()
export class TransactionManager {
  private readonly _logger = new Logger(TransactionManager.name);
  private transactions = new Map<string, Transaction>();
  private jobs = new Map<string, Job[]>();

  constructor(private readonly sequelize: Sequelize) {}

  async addJob(transactionId: string, job: Job) {
    if (!this.jobs.has(transactionId)) {
      this.jobs.set(transactionId, []);
    }

    this.jobs.get(transactionId)?.push(job);
  }

  async getJobStatuses(transactionId: string) {
    const jobs = this.jobs.get(transactionId);
    if (!jobs) {
      return [];
    }

    const statuses = [];

    for (const job of jobs) {
      try {
        const completed = await job.isCompleted();
        const failed = await job.isFailed();

        if (completed) {
          statuses.push({
            id: job.id,
            status: 'completed',
            name: job.name,
          });
        } else if (failed) {
          statuses.push({
            id: job.id,
            status: 'failed',
            name: job.name,
            error: job.failedReason,
          });
        } else {
          statuses.push({
            id: job.id,
            status: 'pending',
            name: job.name,
          });
        }
      } catch (error) {
        statuses.push({
          id: job.id,
          status: 'unknown',
          name: job.name,
          error,
        });
      }
    }

    return statuses;
  }

  async transactionFinished(transactionId: string) {
    const statuses = await this.getJobStatuses(transactionId);

    return statuses.every((status) => status.status === 'completed' || status.status === 'failed');
  }

  async transactionErrored(transactionId: string) {
    const statuses = await this.getJobStatuses(transactionId);

    return statuses.some((status) => status.status === 'failed');
  }

  async jobsFinished(transactionId: string, ids: JobId[]) {
    const statuses = await this.getJobStatuses(transactionId);

    return statuses
      .filter((status) => ids.includes(status.id))
      .every((status) => status.status === 'completed' || status.status === 'failed');
  }

  async transaction(transactionId?: string) {
    transactionId = transactionId ?? uuidv4();
    let transaction: Transaction | undefined = undefined;

    if (this.transactions.has(transactionId)) {
      transaction = this.transactions.get(transactionId);
    }

    if (!transaction) {
      transaction = await this.sequelize.transaction();
      this.transactions.set(transactionId, transaction);
    }

    return transactionId;
  }

  async getTransaction(transactionId: string) {
    if (!this.transactions.has(transactionId)) {
      this._logger.error(`Transaction ${transactionId} not found`);
    }

    return this.transactions.get(transactionId);
  }

  async commitTransaction(transactionId: string) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return;
    }

    await transaction.commit();

    for (const job of this.jobs.get(transactionId) ?? []) {
      await job.remove();
    }

    this.transactions.delete(transactionId);
    this.jobs.delete(transactionId);
  }

  async rollbackTransaction(transactionId: string) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return;
    }

    await transaction.rollback();

    // remove all jobs
    for (const job of this.jobs.get(transactionId) ?? []) {
      await job.remove();
    }

    this.transactions.delete(transactionId);
    this.jobs.delete(transactionId);
  }
}
