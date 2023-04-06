import { Inject, Injectable } from '@angular/core';
import { JobsConfiguration, JOBS_CONFIG_TOKEN } from '../job.module';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  constructor(
    @Inject(JOBS_CONFIG_TOKEN) private config: JobsConfiguration,
    private http: HttpClient
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
}
