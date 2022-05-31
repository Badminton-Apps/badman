import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, merge, of } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap, tap } from 'rxjs/operators';
import { Club, ClubService, pageArgs } from '../../../_shared';
import { SortDirection } from '@angular/material/sort';

@Component({
  templateUrl: './overview-clubs.component.html',
  styleUrls: ['./overview-clubs.component.scss'],
})
export class OverviewClubsComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Club>();
  displayedColumns: string[] = ['name', 'clubId', 'abbreviation'];

  resultsLength = 0;
  isLoadingResults = true;

  pageIndex = 0;
  pageSize = 15;
  active = 'name';
  direction: SortDirection = 'asc';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  filter$ = new BehaviorSubject<{ query?: string }>({
    query: undefined,
  });

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private eventService: ClubService,
    titleService: Title
  ) {
    titleService.setTitle('Clubs');
  }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      this.filter$.next({ query: queryParams['query'] });

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
    this.sort.sortChange.subscribe(() => this.paginator.firstPage());

    // Set the data
    merge(this.sort.sortChange, this.paginator.page, this.filter$)
      .pipe(
        debounceTime(200),
        startWith({}),
        map(() => {
          const direction = this.sort.direction === 'asc' ? 'asc' : 'desc';
          return {
            query: this.filter$.value?.query,
            take: this.paginator.pageSize,
            skip: this.paginator.pageIndex * this.paginator.pageSize,
            order: [
              {
                field: this.sort.active ?? 'name',
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
            if (order.direction !== 'asc' || order.field != 'name') {
              orderSort = order?.field
                ? `${order.field}-${order.direction}`
                : undefined;
            }
          }

          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: {
              query: args.query,
              take: args.take == 15 ? undefined : args.take,
              page:
                this.paginator.pageIndex == 0
                  ? undefined
                  : this.paginator.pageIndex,
              order: orderSort,
            },
            queryParamsHandling: 'merge',
          });
        }),
        switchMap((args: pageArgs) => {
          this.isLoadingResults = true;
          return this.eventService.getClubs(args);
        }),
        map((data) => {
          this.resultsLength = data.count;
          this.isLoadingResults = false;
          return data.rows;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return of([]);
        })
      )
      .subscribe((data) => (this.dataSource.data = data));
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter$.next({
      ...this.filter$.value,
      query: filterValue.trim().toLowerCase(),
    });

    this.paginator.firstPage();
  }
}
