import { DataSource } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, SortDirection } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import {
  getPageArgsFromQueryParams,
  getQueryParamsFromPageArgs,
  pageArgs,
} from '@badman/frontend/shared';
import { Club } from '@badman/frontend/models';

@Component({
  templateUrl: './overview-clubs.component.html',
  styleUrls: ['./overview-clubs.component.scss'],
})
export class OverviewClubsComponent implements OnInit, AfterViewInit {
  dataSource: ClubDataSeource;
  displayedColumns: string[] = ['name', 'clubId', 'abbreviation'];
  private manualSettingParams = false;

  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  filter!: FormGroup;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    apollo: Apollo,
    titleService: Title
  ) {
    titleService.setTitle('Clubs');
    this.dataSource = new ClubDataSeource(apollo);
  }

  ngOnInit() {
    this.activatedRoute.queryParams
      .pipe(filter(() => !this.manualSettingParams))
      .subscribe((queryParams) => {
        const pageArgs = getPageArgsFromQueryParams(queryParams);
        this.filter = new FormGroup({
          query: new FormControl(pageArgs.where?.['query'] ?? ''),
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
}

class ClubDataSeource implements DataSource<Club> {
  private clubsSubject = new BehaviorSubject<Club[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private countSubject = new BehaviorSubject<number>(0);

  public loading$ = this.loadingSubject.asObservable();
  public count$ = this.countSubject.asObservable();

  constructor(private aollo: Apollo) {}

  loadClubs(args: pageArgs) {
    this.loadingSubject.next(true);
    let where: { [key: string]: unknown } | undefined = undefined;

    if (args?.where?.['query']) {
      where = {
        $or: [
          {
            name: {
              $iLike: `%${args?.where?.['query']}%`,
            },
          },
          {
            fullName: {
              $iLike: `%${args?.where?.['query']}%`,
            },
          },
          {
            abbreviation: {
              $iLike: `%${args?.where?.['query']}%`,
            },
          },
        ],
      };
    }

    this.aollo
      .query<{
        clubs: {
          count: number;
          rows: Club[];
        };
      }>({
        query: gql`
          query GetClubs(
            $take: Int
            $skip: Int
            $where: JSONObject
            $order: [SortOrderType!]
          ) {
            clubs(take: $take, skip: $skip, where: $where, order: $order) {
              count
              rows {
                id
                slug
                name
                fullName
                clubId
                abbreviation
              }
            }
          }
        `,
        variables: {
          take: args.take,
          skip: args.skip,
          where,
          order: args.order ?? [{ field: 'name', direction: 'asc' }],
        },
      })
      .pipe(
        map((x) => {
          return {
            count: x.data.clubs.count,
            rows: x.data.clubs.rows.map((c) => new Club(c)),
          };
        })
      )
      .subscribe((result) => {
        this.countSubject.next(result.count);
        this.clubsSubject.next(result.rows);
        this.loadingSubject.next(false);
      });
  }

  connect(): Observable<Club[]> {
    return this.clubsSubject.asObservable();
  }

  disconnect(): void {
    this.clubsSubject.complete();
    this.loadingSubject.complete();
  }
}
