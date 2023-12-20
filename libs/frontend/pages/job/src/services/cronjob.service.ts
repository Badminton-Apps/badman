import { Injectable, inject } from '@angular/core';
import { CronJob, Service } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { Apollo, gql } from 'apollo-angular';
import { Socket } from 'ngx-socket-io';
import { signalSlice } from 'ngxtension/signal-slice';
import { Observable, merge } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface CronJobState {
  cronJobs: CronJob[];
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CronJobService {
  socket = inject(Socket);
  apollo = inject(Apollo);
  jobService = inject(JobsService);

  initialState: CronJobState = {
    cronJobs: [],
    loaded: false,
  };

  // sources
  private servicesLoaded$ = this.apollo
    .query<{
      cronJobs: Service[];
    }>({
      query: gql`
        query CronJobs {
          cronJobs {
            updatedAt
            createdAt
            id
            name
            cronTime
            lastRun
            nextRun
            running
            meta {
              jobName
              queueName
              arguments
            }
          }
        }
      `,
    })
    .pipe(
      map((res) => res.data?.cronJobs?.map((item) => new CronJob(item)) ?? []),
      map((cronJobs) =>
        cronJobs.sort((a, b) => `${a.name}`.localeCompare(`${b.name}`)),
      ),
    );

  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((cronJobs) => ({
        cronJobs,
        loaded: true,
      })),
    ),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      queue: (_state, action$: Observable<CronJob>) =>
        action$.pipe(switchMap((job) => this.jobService.queueJob(job, {}))),
    },
  });

  constructor() {}
}
