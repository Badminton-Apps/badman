import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ClubService } from 'app/_shared';
import { Club } from 'app/_shared/models/club.model';
import { BehaviorSubject, combineLatest, of as observableOf } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './overview-clubs.component.html',
  styleUrls: ['./overview-clubs.component.scss'],
})
export class OverviewClubsComponent {
  dataSource = new MatTableDataSource<Club>();
  displayedColumns: string[] = ['name', 'clubId', 'abbreviation'];

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(10);
  filterChange$ = new BehaviorSubject<{ query: string }>({
    query: undefined,
  });
  onPaginateChange = new EventEmitter<PageEvent>();

  totalItems: number;
  isLoadingResults = true;
  cursor: string;
  prevCursor: string;
  nextCursor: string;

  @ViewChild(MatSort) sort: MatSort;

  constructor(private eventService: ClubService) {}

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
          return this.eventService.getClubs({
            first: this.pageSize$.value,
            after: this.cursor,
            query: filterChange.query,
          });
        }),
        map((data) => {
          const count = data.clubs?.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);

          if (count) {
            this.nextCursor = data.clubs.edges[data.clubs.edges.length - 1].cursor;

            return data.clubs.edges.map((x) => x.node);
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
}
