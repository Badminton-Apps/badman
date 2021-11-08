import { animate, state, style, transition, trigger } from '@angular/animations';
import { SelectionModel } from '@angular/cdk/collections';
import { Component, EventEmitter, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CompetitionEvent, Event, EventService, EventType, TournamentEvent } from 'app/_shared';
import { BehaviorSubject, combineLatest, of as observableOf } from 'rxjs';
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
export class OverviewComponent {
  dataSource = new MatTableDataSource<Event>();
  displayedColumns: string[] = ['select', 'dates', 'name', 'registration'];
  expandedElement!: Event | null;
  selection = new SelectionModel<string>(true, []);

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(10);
  filterChange$ = new BehaviorSubject<{
    query?: string;
    eventType?: EventType;
    startYear?: number;
  }>({
    eventType: undefined,
    query: undefined,
    startYear: undefined,
  });
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

  constructor(private eventService: EventService) {}

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;

    // Reset when any filter changes
    this.sort.sortChange.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = undefined;
    });
    this.filterChange$.subscribe(() => {
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
      this.filterChange$,
      this.sort.sortChange.pipe(startWith({})),
      this.onPaginateChange.pipe(startWith({})),
    ])
      .pipe(
        debounceTime(300),
        switchMap(([filterChange, sortChange, pageChange]) => {
          this.isLoadingResults = true;

          const where: { [key: string]: any } = {};

          if (filterChange.query) {
            where['name'] = {
              $iLike: `%${filterChange.query}%`,
            };
          }

          if (filterChange.startYear) {
            where['startYear'] = filterChange.startYear;
          }

          return this.eventService.getEvents({
            first: this.pageSize$.value,
            after: this.cursor,
            type: filterChange.eventType,
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
  filterName(query: string) {
    this.filterChange$.next({
      ...this.filterChange$.value,
      query,
    });
  }

  filterType(eventType: MatSelectChange) {
    this.filterChange$.next({
      ...this.filterChange$.value,
      eventType: EventType[eventType.value as EventType],
    });
  }

  filterYear(year: number) {
    this.filterChange$.next({
      ...this.filterChange$.value,
      startYear: year,
    });
  }

  checkboxLabel(row: string): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'}`;
  }

  async setOpenState(state: boolean) {
    for (const selected of this.selection.selected) {
      await this.eventService
        .updateCompetitionEvent({
          id: selected,
          allowEnlisting: state,
        })
        .toPromise();
    }
    // Just reload :P
    this.filterChange$.next(this.filterChange$.value);
  }
}
