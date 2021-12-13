import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo } from 'apollo-angular';
import { Subscription } from 'rxjs';
import * as cronQuery from './graphql/getCronStatusQuery.graphql';
import cronstrue from 'cronstrue';

@Component({
  templateUrl: './overview-jobs.component.html',
  styleUrls: ['./overview-jobs.component.scss'],
})
export class OverviewJobsComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = ['running', 'name', 'scheduled', 'cron', 'done', 'options'];

  private querySubscription!: Subscription;

  constructor(private apollo: Apollo) {}

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

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
  }
}
