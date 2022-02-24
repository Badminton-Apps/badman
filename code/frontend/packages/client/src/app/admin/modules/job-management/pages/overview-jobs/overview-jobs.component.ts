import { HttpClient } from '@angular/common/http';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo } from 'apollo-angular';
import { Cron, EVENTS } from 'app/_shared';
import cronstrue from 'cronstrue';
import { environment } from 'environments/environment';
import { Socket } from 'ngx-socket-io';
import { map, Subscription, take } from 'rxjs';
import * as cronQuery from './graphql/getCronStatusQuery.graphql';

@Component({
  templateUrl: './overview-jobs.component.html',
  styleUrls: ['./overview-jobs.component.scss'],
})
export class OverviewJobsComponent implements OnInit, OnDestroy {
  private urlBase = `${environment.api}/api/${environment.apiVersion}/job`;

  dataSource = new MatTableDataSource<Cron>();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = ['running', 'name', 'scheduled', 'cron', 'done', 'lastRun', 'options'];

  private querySubscription!: Subscription;

  constructor(private apollo: Apollo, private httpClient: HttpClient, private socket: Socket) {}

  ngOnInit(): void {
    this.querySubscription = this.apollo
      .query<{ crons: Cron[] }>({
        query: cronQuery,
      })
      .pipe(
        take(1),
        map((results) => results.data.crons?.map((c) => new Cron(c)))
      )
      .subscribe((crons) => {
        this.dataSource.data = crons?.map((cron: any) => {
          return { ...cron, tooltip: cronstrue.toString(cron.cron) };
        });
      });


    this.socket.fromEvent<Cron>(EVENTS.JOB.CRON_STARTED).subscribe((data) => {
      const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
      this.dataSource.data[index]!.running! = true;
    });

    this.socket.fromEvent<Cron>(EVENTS.JOB.CRON_UPDATE).subscribe((data) => {
      const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
      this.dataSource.data[index]!.meta! = data.meta;
    });
    this.socket.fromEvent<Cron>(EVENTS.JOB.CRON_FINISHED).subscribe((data) => {
      const index = this.dataSource.data.findIndex((cron) => cron.id === data.id);
      this.dataSource.data[index]!.running! = false;
    });
  }

  runJob(cronJob) {
    this.httpClient.post(`${this.urlBase}/single-run?type=${cronJob.type}`, {}).subscribe(() => {});
  }

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
  }
}
