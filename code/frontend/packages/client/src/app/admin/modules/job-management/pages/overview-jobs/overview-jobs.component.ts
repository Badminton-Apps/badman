import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo } from 'apollo-angular';
import { Subscription } from 'rxjs';
import * as cronQuery from './graphql/getCronStatusQuery.graphql';
import cronstrue from 'cronstrue';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

@Component({
  templateUrl: './overview-jobs.component.html',
  styleUrls: ['./overview-jobs.component.scss'],
})
export class OverviewJobsComponent implements OnInit, OnDestroy {
  private urlBase = `${environment.api}/${environment.apiVersion}/job`;

  dataSource = new MatTableDataSource();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = ['running', 'name', 'scheduled', 'cron', 'done', 'lastRun', 'options'];

  private querySubscription!: Subscription;

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  ngOnInit(): void {
    this.querySubscription = this.apollo
      .watchQuery<any>({
        query: cronQuery,
        pollInterval: 5000,
      })
      .valueChanges.subscribe(({ data, loading }) => {
        this.isLoadingResults = loading;
        this.dataSource.data = data.crons?.map((cron: any) => {
          return { ...cron, tooltip: cronstrue.toString(cron.cron) };
        });
      });
  }

  runJob(cronJob) {
    this.httpClient.post(`${this.urlBase}/single-run?type=${cronJob.type}`, {}).subscribe(() => {});
  }

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
  }
}
