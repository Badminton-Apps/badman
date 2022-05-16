import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { RankingPlace, SystemService } from '../../../_shared';

@Component({
  templateUrl: './top-players.component.html',
  styleUrls: ['./top-players.component.scss'],
})
export class TopPlayersComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<RankingPlace>();
  displayedColumns: string[] = [
    'player',
    'singleRank',
    'single',
    'doubleRank',
    'double',
    'mixRank',
    'mix',
  ];

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

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private apollo: Apollo,
    private systemService: SystemService
  ) {}

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

      const prev = newPage.previousPageIndex;
      if (!prev) {
        throw new Error('Previous Page Index is undefined');
      }

      if (prev < newPage.pageIndex) {
        // We are going to the next page
        this.prevCursor = this.cursor;
        this.cursor = this.nextCursor;
      } else if (prev > newPage.pageIndex) {
        // We are going to the prev page
        this.cursor = this.prevCursor;
      }
    });

    combineLatest([
      this.filter.valueChanges.pipe(startWith(this.filter.value)),
      this.sort.sortChange.pipe(
        startWith({ active: this.sort.active, direction: this.sort.direction })
      ),
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
          return this.systemService.getPrimarySystemsWhere().pipe(
            switchMap((query) =>
              this.apollo.query<{
                rankingSystems: {
                  id: string;
                  lastPlaces: {
                    total: number;
                    edges: { cursor: string; node: RankingPlace }[];
                  };
                }[];
              }>({
                query: gql`
                  query PlayerRankings(
                    $systemsWhere: JSONObject
                    $where: JSONObject
                    $after: String
                    $first: Int
                    $orderBy: [RankingOrderBy]
                  ) {
                    systems(where: $systemsWhere) {
                      id
                      name
                      lastPlaces(
                        where: $where
                        after: $after
                        first: $first
                        orderBy: $orderBy
                      ) {
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
                  orderBy: `${sortChange.direction == 'asc' ? '' : 'reverse_'}${
                    sortChange.active
                  }`,
                  where,
                  systemsWhere: query,
                },
              })
            )
          );
        }),
        map((result) => {
          const count = result.data.rankingSystems[0]?.lastPlaces.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);

          if (count) {
            this.nextCursor =
              result.data.rankingSystems[0]?.lastPlaces.edges[
                result.data.rankingSystems[0]?.lastPlaces.edges.length - 1
              ].cursor;

            return result.data.rankingSystems[0]?.lastPlaces.edges.map((x) => x.node);
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
