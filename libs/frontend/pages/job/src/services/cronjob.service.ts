import { Injectable, inject } from '@angular/core';
import { CronJob, Service } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Socket } from 'ngx-socket-io';
import { signalSlice } from 'ngxtension/signal-slice';
import { merge } from 'rxjs';
import { map } from 'rxjs/operators';

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
  });

  constructor() {}
}
