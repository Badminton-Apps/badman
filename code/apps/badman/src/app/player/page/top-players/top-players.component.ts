import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { merge, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { pageArgs, RankingPlace, SystemService } from '../../../_shared';

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
  filter!: FormGroup;

  resultsLength = 0;
  isLoadingResults = true;

  pageIndex = 0;
  pageSize = 15;
  active = 'name';
  direction: SortDirection = 'asc';

  private manualSettingParams = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private apollo: Apollo,
    private systemService: SystemService,
    titleService: Title
  ) {
    titleService.setTitle('Players');
  }

  ngOnInit() {
    this.filter = new FormGroup({
      gender: new FormControl('M'),
    });

    this.activatedRoute.queryParams
      .pipe(filter(() => !this.manualSettingParams))
      .subscribe((queryParams) => {
        this.filter.setValue({ gender: queryParams['gender'] ?? 'M' });

        const order = queryParams['order'];
        if (order?.length > 0) {
          const [field, direction] = order.split('-');
          this.active = field || 'name';
          this.direction = direction || 'asc';
        }

        this.pageIndex = queryParams['page'] ?? 0;
        this.pageSize = queryParams['take'] ?? 15;
      });
  }

  ngAfterViewInit() {
    // Link data
    this.dataSource.sort = this.sort;

    // Reset paginator when sort changes
    this.sort.sortChange.subscribe(() => {
      return this.paginator.firstPage();
    });

    // Reset paginator when filter changes
    this.filter.valueChanges.subscribe(() => {
      return this.paginator.firstPage();
    });

    // Set the data
    merge(this.sort.sortChange, this.paginator.page, this.filter.valueChanges)
      .pipe(
        debounceTime(100),
        tap(() => {
          this.isLoadingResults = true;
        }),
        startWith({}),
        map(() => {
          const direction = this.sort.direction === 'asc' ? 'asc' : 'desc';
          return {
            where: {
              gender: this.filter.value?.gender,
            },
            take: this.paginator.pageSize,
            skip: this.paginator.pageIndex * this.paginator.pageSize,
            order: [
              {
                field: this.sort.active ?? 'singleRank',
                direction,
              },
            ],
          } as pageArgs;
        }),
        tap((args) => {
          let order: { field: string; direction: string } | undefined =
            undefined;
          let orderSort: string | undefined = undefined;

          if (args.order) {
            order = args.order[0];
            if (order.direction !== 'asc' || order.field != 'singleRank') {
              orderSort = order?.field
                ? `${order.field}-${order.direction}`
                : undefined;
            }
          }

          this.manualSettingParams = true;
          this.router
            .navigate([], {
              relativeTo: this.activatedRoute,
              replaceUrl: true,
              queryParams: {
                gender: args.where?.['gender'] ,
                take: args.take == 15 ? undefined : args.take,
                page:
                  this.paginator.pageIndex == 0
                    ? undefined
                    : this.paginator.pageIndex,
                order: orderSort,
              },
              queryParamsHandling: 'merge',
            })
            .then(() => {
              this.manualSettingParams = false;
            });
        }),
        switchMap((args: pageArgs) => {
          return this.systemService.getPrimarySystemsWhere().pipe(
            switchMap((query) =>
              this.apollo.query<{
                rankingSystems: {
                  id: string;
                  name: string;
                  rankingLastPlaces: {
                    count: number;
                    rows: RankingPlace[];
                  };
                }[];
              }>({
                query: gql`
                  query PlayerRankings(
                    $systemsWhere: JSONObject
                    $where: JSONObject
                    $skip: Int
                    $take: Int
                    $order: [SortOrderType!]
                  ) {
                    rankingSystems(where: $systemsWhere) {
                      id
                      name
                      rankingLastPlaces(
                        where: $where
                        skip: $skip
                        take: $take
                        order: $order
                      ) {
                        count
                        rows {
                          id
                          single
                          mix
                          double
                          singleRank
                          mixRank
                          doubleRank
                          player {
                            id
                            fullName
                            slug
                            gender
                          }
                        }
                      }
                    }
                  }
                `,
                variables: {
                  ...args,
                  systemsWhere: query,
                },
              })
            )
          );
        }),
        map((result) => {
          this.resultsLength =
            result?.data?.rankingSystems?.[0]?.rankingLastPlaces.count ?? 0;
          if (this.resultsLength > 0) {
            return result?.data?.rankingSystems?.[0]?.rankingLastPlaces.rows?.map(
              (r) => new RankingPlace(r)
            );
          }
          return [];
        }),
        catchError(() => {
          return of([]);
        })
      )
      .subscribe((data) => {
        this.dataSource.data = data;
        this.isLoadingResults = false;
      });
  }
}
