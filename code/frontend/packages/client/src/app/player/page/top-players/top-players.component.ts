import { AfterViewInit, Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ITdDataTableColumn, ITdDataTableSortChangeEvent, TdDataTableSortingOrder } from '@covalent/core/data-table';
import { IPageChangeEvent, TdPagingBarComponent } from '@covalent/core/paging';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { SystemService, PlayerService, Player, RankingPlace } from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  flatMap,
  map,
  mergeMap,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';

@Component({
  templateUrl: './top-players.component.html',
  styleUrls: ['./top-players.component.scss'],
})
export class TopPlayersComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<RankingPlace>();
  displayedColumns: string[] = ['player', 'singleRank', 'single', 'doubleRank', 'double', 'mixRank', 'mix'];

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(10);
  filter!: FormGroup;
  onPaginateChange = new EventEmitter<PageEvent>();

  totalItems?: number;
  isLoadingResults = true;
  cursor?: string;
  prevCursor?: string;
  nextCursor?: string;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private apollo: Apollo) {}

  ngOnInit() {
    this.filter = new FormGroup({
      gender: new FormControl('M'),
    });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    // Reset when any filter changes

    this.sort.sortChange.subscribe((r) => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { active: r.active, direction: r.direction },
        queryParamsHandling: 'merge',
      });
    });

    this.pageSize$.subscribe((r) => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { size: r },
        queryParamsHandling: 'merge',
      });
    });

    this.filter.valueChanges.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { ...this.filter.value },
        queryParamsHandling: 'merge',
      });
    });

    this.onPaginateChange.subscribe((newPage: PageEvent) => {
      this.pageSize$.next(newPage.pageSize);

      if (newPage.previousPageIndex! < newPage.pageIndex) {
        // We are going to the next page
        this.prevCursor = this.cursor;
        this.cursor = this.nextCursor;
      } else if (newPage.previousPageIndex! > newPage.pageIndex) {
        // We are going to the prev page
        this.cursor = this.prevCursor;
      }
    });

    combineLatest([
      this.filter.valueChanges.pipe(startWith(this.filter.value)),
      this.sort.sortChange.pipe(startWith({ active: this.sort.active, direction: this.sort.direction })),
      this.onPaginateChange.pipe(startWith({})),
    ])
      .pipe(
        debounceTime(300),
        switchMap(([filterChange, sortChange, pageChange]) => {
          this.isLoadingResults = true;

          // Build where query
          const where: { [key: string]: object } = {};
          where['gender'] = filterChange?.gender;

          // Query graph
          return this.apollo.query<{
            systems: {
              id: string;
              lastPlaces: {
                total: number;
                edges: { cursor: string; node: RankingPlace }[];
              };
            }[];
          }>({
            query: gql`
              query PlayerRankings(
                $systemsWhere: SequelizeJSON
                $where: SequelizeJSON
                $after: String
                $first: Int
                $orderBy: [RankingOrderBy]
              ) {
                systems(where: $systemsWhere) {
                  id
                  name
                  lastPlaces(where: $where, after: $after, first: $first, orderBy: $orderBy) {
                    total
                    edges {
                      cursor
                      node {
                        single
                        mix
                        double
                        singleRank
                        mixRank
                        doubleRank
                        player {
                          fullName
                          slug
                          gender
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              first: this.pageSize$.value,
              after: this.cursor,
              orderBy: `${sortChange.direction == 'asc' ? '' : 'reverse_'}${sortChange.active}`,
              where,
              systemsWhere: {
                primary: true,
              },
            },
          });
        }),
        map((result) => {
          const count = result.data.systems[0]!.lastPlaces.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);

          if (count) {
            this.nextCursor =
              result.data.systems[0]!.lastPlaces.edges[result.data.systems[0]!.lastPlaces.edges.length - 1].cursor;

            return result.data.systems[0]!.lastPlaces.edges.map((x) => x.node);
          } else {
            return [];
          }
        }),
        catchError((error) => {
          this.isLoadingResults = false;
          console.error(error);
          return of([]);
        })
      )
      .subscribe((data) => (this.dataSource.data = data));
  }
}
