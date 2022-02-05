import { animate, state, style, transition, trigger } from '@angular/animations';
import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionEvent, Event, EventService, EventType, TournamentEvent } from 'app/_shared';
import * as moment from 'moment';
import { BehaviorSubject, combineLatest, of as observableOf, tap } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class OverviewComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Event>();
  displayedColumns: string[] = ['select', 'dates', 'name', 'registration'];
  expandedElement!: Event | null;
  selection = new SelectionModel<string>(true, []);

  formGroup!: FormGroup;

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(25);

  onPaginateChange = new EventEmitter<PageEvent>();

  eventTypes = [
    { label: 'competition', value: EventType.COMPETITION_CP },
    { label: 'tournament', value: EventType.TOURNAMENT },
  ];

  totalItems!: number;
  isLoadingResults = true;
  cursor?: string;
  prevCursor?: string;
  nextCursor?: string;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private eventService: EventService, private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    const queryParams = this.activatedRoute.snapshot.queryParams;

    this.formGroup = new FormGroup({
      query: new FormControl(queryParams['query']),
      startYear: new FormControl(parseInt(queryParams['year'], 10) ?? undefined, [Validators.pattern('^[0-9]*$')]),
      type: new FormControl(queryParams['type'] ?? EventType.COMPETITION_CP, [Validators.required]),
      allowEnlisting: new FormControl(
        queryParams['allowEnlisting'] === undefined ? undefined : queryParams['allowEnlisting'] === 'true'
      ),
      started: new FormControl(queryParams['started'] === undefined ? undefined : queryParams['started'] === 'true'),
    });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    // Reset when any filter changes
    this.sort.sortChange.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
    });
    this.formGroup.valueChanges.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
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
      this.formGroup.valueChanges,
      this.sort.sortChange.pipe(startWith({})),
      this.onPaginateChange.pipe(startWith({})),
    ])
      .pipe(
        startWith([this.formGroup.value, undefined, undefined]),
        debounceTime(300),
        map(([filterChange]) => {
          
          const where: { [key: string]: any } = {};

          if (filterChange.query) {
            where['name'] = {
              $iLike: `%${filterChange.query}%`,
            };
          } else {
            where['name'] = undefined;
          }

          if (filterChange.startYear) {
            if (filterChange.type === EventType.COMPETITION_CP) {
              where['startYear'] = filterChange.startYear;
            } else {
              where['firstDay'] = {
                $between: [
                  moment([filterChange.startYear, 0, 1]).toISOString(),
                  moment([filterChange.startYear + 1, 0, 1]).toISOString(),
                ],
              };
            }
          } else {
            where['startYear'] = undefined;
          }

          if (filterChange.started != undefined && filterChange.type == EventType.COMPETITION_CP) {
            where['started'] = filterChange.started;
          } else {
            where['started'] = undefined;
          }

          if (filterChange.allowEnlisting != undefined) {
            where['allowEnlisting'] = filterChange.allowEnlisting;
          } else {
            where['allowEnlisting'] = undefined;
          }

          return { where, type: filterChange.type, query: filterChange.query ?? undefined, year: filterChange.startYear ?? undefined  };
        }),
        tap(({ where, type, query, year }) => {
          const { name, firstDay, ...params } = where;

          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: {
              ...params,
              query,
              type,
              year
            },
          });
        }),
        switchMap(({ where, type }) => {
          this.isLoadingResults = true;

          return this.eventService.getEvents({
            first: this.pageSize$.value,
            after: this.cursor,
            type,
            where,
          });
        }),
        map((data) => {
          const events = data?.events ?? [];
          const count = data?.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);

          if (count) {
            this.nextCursor = events[events.length - 1].cursor;

            return events.map((x: { node: CompetitionEvent | TournamentEvent }) => x.node);
          } else {
            return [];
          }
        }),
        catchError((error) => {
          this.isLoadingResults = false;
          console.error(error);
          return observableOf([]);
        })
      )
      .subscribe((data) => (this.dataSource.data = data));
  }

  checkboxLabel(row: string): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'}`;
  }

  async setOpenState(state: boolean) {
    for (const selected of this.selection.selected) {
      this.eventService
        .updateCompetitionEvent({
          id: selected,
          allowEnlisting: state,
        })
        .subscribe((_) => {
          // trigger update
          this.formGroup.updateValueAndValidity({ onlySelf: false, emitEvent: true });
        });
    }
  }
}

interface EventFilters {
  query?: string;
  eventType?: EventType;
  startYear?: number;
  allowEnlisting?: boolean;
  started?: boolean;
}
