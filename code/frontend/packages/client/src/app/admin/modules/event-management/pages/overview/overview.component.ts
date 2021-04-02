import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { SelectionModel } from '@angular/cdk/collections';
import { Component, EventEmitter, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Event, EventService, EventType } from 'app/_shared';
import { BehaviorSubject, combineLatest, of as observableOf } from 'rxjs';
import {
  catchError,
  debounceTime,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

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
export class OverviewComponent {
  dataSource = new MatTableDataSource<Event>();
  displayedColumns: string[] = ['select', 'dates', 'name'];
  expandedElement: Event | null;
  selection = new SelectionModel<Event>(true, []);

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(10);
  filterChange$ = new BehaviorSubject<{ query: string; eventType: EventType }>({
    eventType: undefined,
    query: undefined,
  });
  onPaginateChange = new EventEmitter<PageEvent>();

  eventTypes = [{ label: 'competition', value: EventType.COMPETITION_CP }, { label: 'toernament', value: EventType.TOERNAMENT }];

  totalItems: number;
  isLoadingResults = true;
  cursor: string;
  prevCursor: string;
  nextCursor: string;

  @ViewChild(MatSort) sort: MatSort;

  constructor(private eventService: EventService) {}

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    
    // Reset when any filter changes
    this.sort.sortChange.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = null;
    });
    this.filterChange$.subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = null;
    });

    this.onPaginateChange.subscribe((newPage: PageEvent) => {
      this.pageSize$.next(newPage.pageSize);

      if (newPage.previousPageIndex < newPage.pageIndex) {
        // We are going to the next page
        this.prevCursor = this.cursor;
        this.cursor = this.nextCursor;
      } else if (newPage.previousPageIndex > newPage.pageIndex) {
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
          return this.eventService.getEvents(
            `DATE_${this.sort.direction.toUpperCase()}`,
            this.pageSize$.value,
            this.cursor,
            filterChange.eventType,
            filterChange.query
          );
        }),
        map((data) => {
          const count = data.events?.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);

          if (count) {
            this.nextCursor =
              data.events.edges[data.events.edges.length - 1].cursor;

            return data.events.edges.map((x) => x.node);
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
      eventType: EventType[eventType.value],
    });
  }

  checkboxLabel(row?: Event): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'}`;
  }

  async uploadFile(fileInputEvent: any) {
    let result = await this.eventService
      .upload(fileInputEvent.target.files)
      .toPromise();
  }
}
