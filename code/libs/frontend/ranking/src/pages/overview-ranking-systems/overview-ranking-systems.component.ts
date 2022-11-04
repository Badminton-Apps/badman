import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  ChangeDetectionStrategy, Component,
  ViewChild
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { RankingSystem } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { BehaviorSubject, combineLatest, lastValueFrom, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';
import { SystemService } from '../../services';

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

  constructor(private systemsService: SystemService, private apollo: Apollo) {
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
        switchMap(([, , update]) => {
          this.isLoadingResults = true;
          return this.apollo.query<{ rankingSystems: RankingSystem[] }>({
            fetchPolicy: update ? 'network-only' : 'cache-first',
            query: gql`
              query GetSystemsQuery(
                $order: [SortOrderType!]
                $skip: Int
                $take: Int
              ) {
                rankingSystems(order: $order, skip: $skip, take: $take) {
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
              order: {
                field: this.sort.active,
                direction: this.sort.direction,
              }, // `${this.sort.direction == 'asc' ? '' : 'reverse:'}${this.sort.active}`,
              skip:
                (this.paginator.pageIndex ?? 0) *
                (this.paginator.pageSize ?? 15),
              take: this.paginator.pageSize,
            },
          });
        }),
        map((x) => x.data?.rankingSystems.map((s) => new RankingSystem(s))),
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
        tap(() => this.rankingSelection.clear())
      )
      .subscribe((data) => {
        this.dataSource.data = data;
      });
  }

  watchSystem(system: RankingSystem) {
    this.systemsService.watchSystem(system);
  }

  isAllSelected() {
    const numSelected = this.rankingSelection.selected.length;
    const numRows = this.resultsLength;
    return numSelected === numRows;
  }

  async makePrimary(systemId: RankingSystem) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation UpdateRankingSystem($rankingSystem: RankingSystemInput!) {
            updateRankingSystem(rankingSystem: $rankingSystem) {
              id
            }
          }
        `,
        variables: {
          rankingSystem: {
            id: systemId.id,
            primary: true,
          },
        },
      })
    );
  }
  async deleteSystem(systemId: string) {
    await lastValueFrom(
      this.apollo
        .mutate({
          mutation: gql`
            mutation RemoveRankingSystem($rankingsystemIdId: ID) {
              removeRankingSystem(RankingsystemIdId: $rankingsystemIdId)
            }
          `,
          variables: {
            rankingsystemIdId: systemId,
          },
        })
        .pipe(tap(() => this.updateHappend.next(true)))
    );
  }
}