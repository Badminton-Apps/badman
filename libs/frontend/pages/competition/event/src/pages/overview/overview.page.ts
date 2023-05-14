import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  TransferState,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AddEventComponent,
  HasClaimComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-jobs';
import { EventCompetition } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom, merge } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RisersFallersDialogComponent } from '../../dialogs';

@Component({
  selector: 'badman-competition-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    MomentModule,
    HasClaimComponent,

    // Material Modules
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
})
export class OverviewPageComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'subEvents', 'open', 'close', 'menu'];
  data: EventCompetition[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  filter: FormGroup;

  isLoadingResults = true;
  isRateLimitReached = false;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private translate: TranslateService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private jobsService: JobsService,
    private matSnackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    formBuilder: FormBuilder,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {
    this.filter = formBuilder.group({
      name: new FormControl(),
      official: new FormControl(),
      year: new FormControl(),
    });
  }

  ngOnInit(): void {
    this.translate.get(['all.competition.title']).subscribe((enrollemnt) => {
      this.seoService.update({
        title: enrollemnt['all.competition.title'],
        description: enrollemnt['all.competition.title'],
        type: 'website',
        keywords: ['competition'],
      });

      this.breadcrumbsService.set(
        'competition',
        enrollemnt['all.competition.title']
      );
    });
  }

  ngAfterViewInit(): void {
    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page, this.filter.valueChanges)
      .pipe(
        // Don't startWith({}) this will cause the first request to be loaded with the default values, and thus not using query param
        switchMap(() => {
          // store params in query params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              sort: this.sort.active == 'name' ? undefined : this.sort.active,
              direction:
                this.sort.direction == 'asc' ? undefined : this.sort.direction,
              page:
                this.paginator.pageIndex == 0
                  ? undefined
                  : this.paginator.pageIndex,
              size:
                this.paginator.pageSize == 10
                  ? undefined
                  : this.paginator.pageSize,
              name: !this.filter.value.name
                ? undefined
                : this.filter.value.name,
              year:
                this.filter.value.year == getCurrentSeason()
                  ? undefined
                  : this.filter.value.year,
            },
            queryParamsHandling: 'merge',
            preserveFragment: true,
          });

          this.isLoadingResults = true;
          return this._loadCompetitions(
            this.paginator.pageIndex,
            this.paginator.pageSize,
            this.sort.active,
            this.sort.direction,
            this.filter.value
          );
        }),
        map((data) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          // Only refresh the result length if there is new data. In case of rate
          // limit errors, we do not want to reset the paginator to zero, as that
          // would prevent users from re-triggering requests.
          this.paginator.length = data.count;
          return data.items;
        })
      )
      .subscribe((data) => {
        this.data = data;
      });

    setTimeout(() => {
      this.route.queryParams.subscribe((params) => {
        this.sort.active = params['sort'] || 'name';
        this.sort.direction = params['direction'] || 'asc';
        this.paginator.pageIndex = params['page'] || 0;
        this.paginator.pageSize = params['size'] || 10;
        this.filter.setValue({
          name: params['name'] || '',
          official: (params['official'] || true) == 'true',
          year: +params['year'] || getCurrentSeason(),
        });
      });
    });
  }

  private _loadCompetitions(
    page: number,
    size: number,
    sort?: string,
    direction?: string,

    filter?: {
      name?: string;
      official?: boolean;
      year?: number;
    }
  ) {
    return this.apollo
      .query<{
        eventCompetitions: {
          rows: Partial<EventCompetition>[];
          count: number;
        };
      }>({
        query: gql`
          query GetEventsCompetition(
            $where: JSONObject
            $order: [SortOrderType!]
            $skip: Int
            $take: Int
          ) {
            eventCompetitions(
              where: $where
              order: $order
              skip: $skip
              take: $take
            ) {
              count
              rows {
                id
                name
                slug
                official
                openDate
                closeDate
                visualCode
                subEventCompetitions {
                  id
                  drawCompetitions {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            official: filter?.official == true ? true : undefined,
            name: filter?.name ? { $iLike: `%${filter.name}%` } : undefined,
            season: filter?.year ? filter.year : undefined,
          },
          order: [
            {
              direction: 'desc',
              field: 'official',
            },
            {
              direction: direction || 'desc',
              field: sort || 'name',
            },
          ],
          take: size,
          skip: page * size,
        },
      })
      .pipe(
        transferState(
          `competitions-${sort}-${direction}-${page}-${filter?.name}-${filter?.official}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.eventCompetitions) {
            throw new Error('No competitions found');
          }
          return {
            count: result.data.eventCompetitions.count,
            items: result.data.eventCompetitions.rows.map(
              (team) => new EventCompetition(team)
            ),
          };
        })
      );
  }

  makeOfficial(competition: EventCompetition, offical: boolean) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
            updateEventCompetition(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: competition.id,
            official: offical,
          },
        },
      })
      .subscribe(() => {
        this.matSnackBar.open(
          `Competition ${competition.name} is ${
            offical ? 'official' : 'unofficial'
          }`,
          'Close',
          {
            duration: 2000,
          }
        );

        this.changeDetectorRef.detectChanges();
      });
  }

  async syncEvent(competition: EventCompetition) {
    if (!competition.visualCode) {
      console.warn('No visual code');
      return;
    }

    await lastValueFrom(
      this.jobsService.syncEventById({ id: competition.visualCode })
    );
  }

  async addEvent() {
    const dialogRef = this.dialog.open(AddEventComponent, {
      width: '400px',
    });

    const result = await lastValueFrom(dialogRef.afterClosed());
    if (result?.url) {
      await lastValueFrom(this.jobsService.syncEventById(result));
    }
  }

  setRisersFallers(competition: EventCompetition) {
    // open dialog
    this.dialog.open(RisersFallersDialogComponent, {
      data: { event: competition },
    });
  }

  setOpenClose(competition: EventCompetition) {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: { event: competition },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        competition.openDate = result.openDate;
        competition.closeDate = result.closeDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventCompetition(
                $data: EventCompetitionUpdateInput!
              ) {
                updateEventCompetition(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: competition.id,
                openDate: competition.openDate,
                closeDate: competition.closeDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Competition ${competition.name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              }
            );
            this.changeDetectorRef.detectChanges();
          });
      }
    });
  }
}
