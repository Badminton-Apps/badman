import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JOBS_CONFIG_TOKEN } from '../injection';
import { JobsConfiguration } from '../interfaces';
import { CronJob } from '@badman/frontend-models';

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  constructor(
    @Inject(JOBS_CONFIG_TOKEN) private config: JobsConfiguration,
    private http: HttpClient,
  ) {}

  syncEventById(args: { id: string | string[]; official?: boolean }) {
    return this.http.post(`${this.config.api}/queue-job`, {
      queue: 'sync',
      job: 'SyncEvents',
      jobArgs: {
        id: args.id,
        official: args.official,
      },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  syncRanking() {
    return this.http.post(`${this.config.api}/queue-job`, {
      queue: 'sync',
      job: 'SyncRanking',
      jobArgs: {},
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  checkNotifications(args: { id: string | string[] }) {
    return this.http.post(`${this.config.api}/queue-job`, {
      queue: 'sync',
      job: 'CheckEncounter',
      jobArgs: {
        encounterId: args.id,
      },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  queueJob(
    job: CronJob,
    args: {
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    },
  ) {
    return this.http.post(`${this.config.api}/queue-job`, {
      queue: job.meta?.queueName,
      job: job.meta?.jobName,
      jobArgs: job.meta?.arguments,
      removeOnComplete: args.removeOnComplete,
      removeOnFail: args.removeOnFail,
    });
  }
}
