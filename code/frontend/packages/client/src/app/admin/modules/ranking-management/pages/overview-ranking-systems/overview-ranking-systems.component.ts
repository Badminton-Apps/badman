import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, ChangeDetectionStrategy, Component, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Apollo, gql } from 'apollo-angular';
import { RankingService } from 'app/admin/services';
import { SimulateService } from 'app/admin/services/simulate.service';
import { RankingSystem, SystemService } from 'app/_shared';
import * as moment from 'moment';
import { BehaviorSubject, combineLatest, lastValueFrom, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './overview-ranking-systems.component.html',
  styleUrls: ['./overview-ranking-systems.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewRankingSystemsComponent implements AfterViewInit {
  populateOptions: string[] = [];

  downloading = false;

  dataSource = new MatTableDataSource();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;
  @ViewChild(MatTable, { static: false }) table!: MatTable<RankingSystem>;

  rankingSelection = new SelectionModel<RankingSystem>(true, []);
  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = [
    'select',
    'running',
    'primary',
    'name',
    'procentWinning',
    'procentLosing',
    'latestXGamesToUse',
    'options',
  ];

  updateHappend = new BehaviorSubject(false);

  minDate: FormControl;
  maxDate: FormControl;

  forceStartDate = false;
  startingRankings = false;

  constructor(
    private systemsService: SystemService,
    private apollo: Apollo,
    private rankingService: RankingService,

    private simulateService: SimulateService,
    private dialog: MatDialog
  ) {
    this.minDate = new FormControl(moment([2017, 8, 1]), [Validators.required]);
    this.maxDate = new FormControl(moment([2020, 3, 1]), [Validators.required]);
  }

  ngAfterViewInit() {
    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    combineLatest([
      this.sort.sortChange.pipe(startWith({})),
      this.paginator.page.pipe(startWith({})),
      this.updateHappend,
    ])
      .pipe(
        shareReplay(),
        switchMap(([sort, page, update]) => {
          this.isLoadingResults = true;
          return this.apollo.query<{ systems: RankingSystem[] }>({
            fetchPolicy: update ? 'network-only' : 'cache-first',
            query: gql`
              query GetSystemsQuery($order: String, $offset: Int, $limit: Int) {
                systems(order: $order, offset: $offset, limit: $limit) {
                  id
                  primary
                  runCurrently
                  name
                  procentWinning
                  procentLosing
                  latestXGamesToUse
                  rankingSystem
                }
              }
            `,
            variables: {
              order: `${this.sort.direction == 'asc' ? '' : 'reverse:'}${this.sort.active}`,
              offset: (this.paginator.pageIndex ?? 0) * (this.paginator.pageSize ?? 15),
              limit: this.paginator.pageSize,
            },
          });
        }),
        map((x) => x.data?.systems.map((s) => new RankingSystem(s))),
        map((data) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = false;
          this.resultsLength = data.length;

          return data;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          // Catch if the GitHub API has reached its rate limit. Return empty data.
          this.isRateLimitReached = true;
          return of([]);
        }),
        distinctUntilChanged(),
        tap((_) => this.rankingSelection.clear())
      )
      .subscribe((data) => {
        this.dataSource.data = data;
        // this.table.renderRows();

        console.log('Updated');
      });
  }

  watchSystem(system: RankingSystem) {
    this.systemsService.watchSystem(system);
  }

  async calculate() {
    await lastValueFrom(
      this.simulateService
        .calculateRanking(
          this.rankingSelection.selected.map((x) => x.id!),
          this.maxDate.value,
          this.forceStartDate ? this.minDate.value : null,
          this.startingRankings
        )
        .pipe(tap((_) => this.updateHappend.next(true)))
    );
  }

  async download(type?: string) {
    this.downloading = true;
    await this.rankingService.downloadRankingAsync(
      this.rankingSelection.selected.map((x) => x.id!),
      type
    );
    this.downloading = false;
  }
  async reset(templateRef: TemplateRef<any>) {
    const dialogRef = this.dialog.open(templateRef);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await lastValueFrom(
          this.simulateService
            .resetRanking(this.rankingSelection.selected.map((x) => x.id!))
            .pipe(tap((_) => this.updateHappend.next(true)))
        );
      }
    });
  }

  isAllSelected() {
    const numSelected = this.rankingSelection.selected.length;
    const numRows = this.resultsLength;
    return numSelected === numRows;
  }

  async makePrimary(systemId: RankingSystem) {
    await lastValueFrom(
      this.systemsService
        .updateSystem({
          id: systemId.id,
          primary: true,
        })
        .pipe(tap((_) => this.updateHappend.next(true)))
    );
  }
  async deleteSystem(systemId: string) {
    await lastValueFrom(
      this.apollo
        .mutate({
          mutation: gql`
            mutation RemoveRankingSystem($rankingSystemIdId: ID) {
              removeRankingSystem(RankingSystemIdId: $rankingSystemIdId)
            }
          `,
          variables: {
            rankingSystemIdId: systemId,
          },
        })
        .pipe(tap((_) => this.updateHappend.next(true)))
    );
  }
}
