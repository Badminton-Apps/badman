import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo } from 'apollo-angular';
import { lastValueFrom, Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Cron, EVENTS, ListenTopic } from '../../../../../_shared';

@Component({
  templateUrl: './overview-jobs.component.html',
  styleUrls: ['./overview-jobs.component.scss'],
})
export class OverviewJobsComponent implements OnDestroy {
  private urlBase = `${environment.api}/api/${environment.apiVersion}/job`;

  dataSource = new MatTableDataSource<Cron>();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = [
    'running',
    'name',
    'scheduled',
    'cron',
    'done',
    'lastRun',
    'options',
  ];

  private querySubscription!: Subscription;

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  // ngOnInit(): void {
  //   this.querySubscription = this.apollo
  //     .query<{ crons: Cron[] }>({
  //       query: cronQuery,
  //     })
  //     .pipe(
  //       take(1),
  //       map((results) => results.data.crons?.map((c) => new Cron(c)))
  //     )
  //     .subscribe((crons) => {
  //       this.dataSource.data = crons?.map((cron: any) => {
  //         return { ...cron, tooltip: cronstrue.toString(cron.cron) };
  //       });
  //     });
  // }

  @ListenTopic(EVENTS.JOB.CRON_STARTED)
  jobStarted(data: Cron) {
    const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
    this.dataSource.data[index].running = true;
  }

  @ListenTopic(EVENTS.JOB.CRON_UPDATE)
  jobUpdated(data: Cron) {
    const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
    this.dataSource.data[index].meta = data.meta;
  }

  @ListenTopic(EVENTS.JOB.CRON_FINISHED)
  jobFinished(data: Cron) {
    const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
    this.dataSource.data[index].running = false;
  }

  runJob(cronJob: Cron) {
    lastValueFrom(
      this.httpClient.post(
        `${this.urlBase}/single-run?type=${cronJob.type}`,
        {}
      )
    );
  }

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
  }
}
