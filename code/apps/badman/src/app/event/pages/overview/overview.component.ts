import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { DataSource, SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, SortDirection } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { BehaviorSubject, forkJoin, merge, Observable, tap } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';
import { apolloCache } from '../../../graphql.module';
import {
  Event,
  EventCompetition,
  EventTournament,
  EventType,
  getPageArgsFromQueryParams,
  getQueryParamsFromPageArgs,
  pageArgs,
} from '../../../_shared';

@Component({
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class OverviewComponent implements OnInit, AfterViewInit {
  dataSource: EventDataSeource;
  displayedColumns: string[] = ['select', 'dates', 'name', 'registration'];
  expandedElement!: Event | null;
  selection = new SelectionModel<string>(true, []);
  private manualSettingParams = false;

  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  filter!: FormGroup;

  eventTypes = [
    { label: 'competition', value: EventType.COMPETITION_CP },
    { label: 'tournament', value: EventType.TOURNAMENT },
  ];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private _dialog: MatDialog,
    private _apollo: Apollo,
    titleService: Title
  ) {
    titleService.setTitle('Events');
    this.dataSource = new EventDataSeource(this._apollo);
  }

  ngOnInit() {
    this.activatedRoute.queryParams
      .pipe(filter(() => !this.manualSettingParams))
      .subscribe((queryParams) => {
        const pageArgs = getPageArgsFromQueryParams(queryParams);

        this.filter = new FormGroup({
          query: new FormControl(pageArgs.where?.['query'] ?? ''),
          startYear: new FormControl(
            parseInt(pageArgs.where?.['year'] as string, 10) || undefined,
            [Validators.pattern('^[0-9]*$')]
          ),
          type: new FormControl(
            pageArgs.where?.['type'] ?? EventType.COMPETITION_CP,
            [Validators.required]
          ),
          allowEnlisting: new FormControl(
            pageArgs.where?.['allowEnlisting'] === undefined
              ? undefined
              : pageArgs.where?.['allowEnlisting'] === 'true'
          ),
          started: new FormControl(
            pageArgs.where?.['started'] === undefined
              ? undefined
              : pageArgs.where?.['started'] === 'true'
          ),
        });

        this.sort.active = pageArgs.order?.[0]?.field ?? 'name';
        this.sort.direction = (pageArgs.order?.[0]?.direction ??
          'asc') as SortDirection;

        this.paginator.pageSize = pageArgs.take ?? 15;
        this.paginator.pageIndex = pageArgs.skip
          ? pageArgs.skip / this.paginator.pageSize
          : 0;

        this.dataSource.loadClubs(pageArgs);
      });
  }

  ngAfterViewInit() {
    // Reset paginator when sort changes
    this.sort.sortChange.subscribe(() => this.paginator.firstPage());

    // Reset paginator when filter changes
    this.filter.valueChanges.subscribe(() => this.paginator.firstPage());

    merge(this.sort.sortChange, this.paginator.page, this.filter.valueChanges)
      .pipe(
        debounceTime(100),
        map(() => {
          return {
            where: {
              query:
                this.filter.value.query?.length > 0
                  ? this.filter.value.query
                  : null,
              type: this.filter.value.type,
              allowEnlisting: this.filter.value.allowEnlisting,
              started: this.filter.value.started,
              year: this.filter.value.startYear,
            },
            take: this.paginator.pageSize,
            skip: this.paginator.pageIndex * this.paginator.pageSize,
            order: [
              {
                field: this.sort.active?.length > 0 ? this.sort.active : 'name',
                direction:
                  this.sort.direction?.length > 0 ? this.sort.direction : 'asc',
              },
            ],
          } as pageArgs;
        }),
        tap((args) => {
          const queryParams = getQueryParamsFromPageArgs(args, {
            where: {
              type: 'COMPETITION_CP',
            },
            order: [
              {
                direction: 'asc',
                field: 'name',
              },
            ],
          });

          this.manualSettingParams = true;
          this.router
            .navigate([], {
              relativeTo: this.activatedRoute,
              replaceUrl: true,
              queryParams,
              queryParamsHandling: 'merge',
            })
            .then(() => {
              this.manualSettingParams = false;
            });
        })
      )
      .subscribe((args) => {
        this.manualSettingParams = true;
        this.dataSource.loadClubs(args);
      });
  }

  checkboxLabel(row: string): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'}`;
  }

  async setOpenState(state: boolean) {
    // for (const selected of this.selection.selected) {
    //   this.eventService
    //     .updateCompetitionEvent({
    //       id: selected,
    //       allowEnlisting: state,
    //     })
    //     .subscribe(() => {
    //       // trigger update
    //       this.filter.updateValueAndValidity({
    //         onlySelf: false,
    //         emitEvent: true,
    //       });
    //     });
    // }
  }

  async copy(templateRef: any) {
    this._dialog
      .open(templateRef, {
        width: '300px',
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          const obs: Observable<unknown>[] = [];
          for (const selected of this.selection.selected) {
            obs.push(
              this._apollo.mutate({
                mutation: gql`
                  mutation CopyEventCompetition($id: ID!, $year: Int!) {
                    copyEventCompetition(id: $id, year: $year) {
                      id
                    }
                  }
                `,
                variables: {
                  id: selected,
                  year: r,
                },
              })
            );
          }

          forkJoin(obs).subscribe(() => {
            const rootQuery = apolloCache.identify({ __typename: 'Query' });
            apolloCache.evict({ id: rootQuery });
            apolloCache.gc();
            this.filter.updateValueAndValidity({
              onlySelf: false,
              emitEvent: true,
            });
          });
        }
      });
  }
}

// interface EventFilters {
//   query?: string;
//   eventType?: EventType;
//   startYear?: number;
//   allowEnlisting?: boolean;
//   started?: boolean;
// }

class EventDataSeource
  implements DataSource<EventCompetition | EventTournament>
{
  private eventSubject = new BehaviorSubject<
    (EventCompetition | EventTournament)[]
  >([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private countSubject = new BehaviorSubject<number>(0);

  public loading$ = this.loadingSubject.asObservable();
  public count$ = this.countSubject.asObservable();

  constructor(private aollo: Apollo) {}

  loadClubs(args: pageArgs) {
    this.loadingSubject.next(true);
    const where: { [key: string]: unknown } = {};

    if (args?.where?.['query']) {
      where['name'] = { $iLike: `%${args?.where?.['query']}%` };
    }
    if (args?.where?.['year']) {
      const year = parseInt(args?.where?.['year'] as string, 10);

      if (args?.where?.['type'] === EventType.COMPETITION_CP) {
        where['startYear'] = year;
      } else {
        where['firstDay'] = {
          $between: [
            moment([year, 0, 1]).toISOString(),
            moment([year + 1, 0, 1]).toISOString(),
          ],
        };
      }
    }

    if (
      args?.where?.['started'] != undefined &&
      args?.where?.['type'] == EventType.COMPETITION_CP
    ) {
      where['started'] = args?.where?.['started'];
    }

    if (args?.where?.['allowEnlisting'] != undefined) {
      where['allowEnlisting'] = args?.where?.['allowEnlisting'];
    }

    let events$: Observable<{
      count: number;
      rows: (EventCompetition | EventTournament)[];
    }>;

    const variables = {
      take: args.take,
      skip: args.skip,
      where,
      order: args.order ?? [{ field: 'name', direction: 'asc' }],
    };

    if (
      (args.where?.['type'] ?? 'COMPETITION_CP') == EventType.COMPETITION_CP
    ) {
      events$ = this._getCompetitions(variables);
    } else {
      events$ = this._getTournaments(variables);
    }

    events$.subscribe((result) => {
      this.countSubject.next(result.count);
      this.eventSubject.next(result.rows);
      this.loadingSubject.next(false);
    });
  }

  connect(): Observable<(EventCompetition | EventTournament)[]> {
    return this.eventSubject.asObservable();
  }

  disconnect(): void {
    this.eventSubject.complete();
    this.loadingSubject.complete();
  }

  private _getCompetitions(variables) {
    return this.aollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: EventCompetition[];
        };
      }>({
        query: gql`
          query GetEvents(
            $take: Int
            $skip: Int
            $where: JSONObject
            $order: [SortOrderType!]
          ) {
            eventCompetitions(
              take: $take
              skip: $skip
              where: $where
              order: $order
            ) {
              count
              rows {
                id
                slug
                name
                startYear
                allowEnlisting
                started
                type
              }
            }
          }
        `,
        variables,
      })
      .pipe(
        map((x) => {
          return {
            count: x.data.eventCompetitions?.count ?? 0,
            rows:
              x.data.eventCompetitions?.rows.map(
                (c) => new EventCompetition(c)
              ) ?? [],
          };
        })
      );
  }
  private _getTournaments(variables) {
    return this.aollo
      .query<{
        eventTournaments: {
          count: number;
          rows: EventTournament[];
        };
      }>({
        query: gql`
          query GetEvents(
            $take: Int
            $skip: Int
            $where: JSONObject
            $order: [SortOrderType!]
          ) {
            eventTournaments(
              take: $take
              skip: $skip
              where: $where
              order: $order
            ) {
              count
              rows {
                id
                slug
                name
                dates
                firstDay
              }
            }
          }
        `,
        variables,
      })
      .pipe(
        map((x) => {
          return {
            count: x.data.eventTournaments?.count ?? 0,
            rows:
              x.data.eventTournaments?.rows.map(
                (c) => new EventTournament(c)
              ) ?? [],
          };
        })
      );
  }
}
