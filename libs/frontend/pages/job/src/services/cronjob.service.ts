import { Injectable, inject } from "@angular/core";
import { CronJob, Service } from "@badman/frontend-models";
import { JobsService } from "@badman/frontend-queue";
import { Apollo, gql } from "apollo-angular";
import { Socket } from "ngx-socket-io";
import { signalSlice } from "ngxtension/signal-slice";
import { Observable, merge } from "rxjs";
import { filter, map, startWith, switchMap } from "rxjs/operators";

export interface CronJobState {
  cronJobs: CronJob[];
  loaded: boolean;
}

@Injectable({
  providedIn: "root",
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
  private servicesLoaded$ = this._loadCronJobs();

  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((cronJobs) => ({
        cronJobs,
        loaded: true,
      }))
    )
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      queue: (_state, action$: Observable<CronJob>) =>
        action$.pipe(switchMap((job) => this.jobService.queueJob(job, {}))),
      toggleActive: (_state, action$: Observable<CronJob>) =>
        action$.pipe(
          switchMap((job) =>
            this.apollo
              .mutate<{
                updateCronJob: Partial<CronJob>;
              }>({
                mutation: gql`
                  mutation Mutation($data: CronJobUpdateInput!) {
                    updateCronJob(data: $data) {
                      id
                      updatedAt
                      createdAt
                      name
                      cronTime
                      lastRun
                      nextRun
                      running
                      type
                      active
                      meta {
                        jobName
                        queueName
                        arguments
                      }
                    }
                  }
                `,
                variables: {
                  data: {
                    id: job.id,
                    active: !job.active,
                  },
                },
              })
              .pipe(
                map((res) => res.data?.updateCronJob),
                filter((updatedJob) => !!updatedJob),
                // switch the job in the array
                map((updatedJob: CronJob) => {
                  const index = _state().cronJobs.findIndex((item) => item.id === updatedJob.id);
                  const jobs = [..._state().cronJobs];

                  jobs[index] = updatedJob;

                  return jobs;
                }),
                map((cronJobs) => ({
                  cronJobs,
                  loaded: true,
                })),
                startWith({
                  loaded: false, // Indicating loading state
                })
              )
          )
        ),
    },
  });

  private _loadCronJobs() {
    return this.apollo
      .query<{
        cronJobs: Service[];
      }>({
        query: gql`
          query CronJobs {
            cronJobs {
              id
              updatedAt
              createdAt
              name
              cronTime
              lastRun
              nextRun
              running
              type
              active
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
        map((cronJobs) => cronJobs.sort((a, b) => `${a.name}`.localeCompare(`${b.name}`)))
      );
  }
}
