import { CommonModule, isPlatformServer } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  AddEventComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { JobsModule, JobsService } from '@badman/frontend-jobs';
import { EventTournament } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { BehaviorSubject, lastValueFrom, merge, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-tournament-overview',
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

    // Own Components
    HasClaimComponent,
    JobsModule,

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
  displayedColumns: string[] = ['name', 'firstDay', 'official', 'menu'];
  data: EventTournament[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  filter: FormGroup;
  update$ = new BehaviorSubject<boolean>(true);

  isLoadingResults = true;
  isRateLimitReached = false;

  constructor(
    private seoService: SeoService,
    private jobsService: JobsService,
    private apollo: Apollo,
    private transferState: TransferState,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: string,
    formBuilder: FormBuilder
  ) {
    this.filter = formBuilder.group({
      name: new FormControl(''),
      official: new FormControl(false),
    });
  }

  ngOnInit(): void {
    this.seoService.update({
      title: `Overview tournament`,
      description: `Overview tournament`,
      type: 'website',
      keywords: ['assembly', 'badminton'],
    });
  }

  ngAfterViewInit(): void {
    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(
      this.sort.sortChange,
      this.paginator.page,
      this.filter.valueChanges,
      this.update$
    )
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this._loadTournaments(
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
  }

  private _loadTournaments(
    page: number,
    size: number,
    aort?: string,
    direction?: string,

    filter?: {
      name?: string;
      official?: boolean;
    }
  ) {
    const STATE_KEY = makeStateKey<{
      count: number;
      items: EventTournament[];
    }>(
      `tournaments-${aort}-${direction}-${page}-${filter?.name}-${filter?.official}`
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, null);
      if (state) {
        this.transferState.remove(STATE_KEY);
        return of({
          count: state.count,
          items: state.items.map((team) => new EventTournament(team)),
        });
      }
      return of(null);
    } else {
      return this.apollo
        .query<{
          eventTournaments: { rows: Partial<EventTournament>[]; count: number };
        }>({
          query: gql`
            query GetEventsTournament(
              $where: JSONObject
              $order: [SortOrderType!]
              $skip: Int
              $take: Int
            ) {
              eventTournaments(
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
                  firstDay
                  openDate
                  closeDate
                  official
                }
              }
            }
          `,
          variables: {
            where: {
              official: filter?.official == true ? true : undefined,
              name: filter?.name ? { $iLike: `%${filter.name}%` } : undefined,
            },
            order: [
              {
                direction: direction || 'desc',
                field: aort || 'firstDay',
              },
            ],
            take: size,
            skip: page * size,
          },
        })
        .pipe(
          map((result) => {
            if (!result.data.eventTournaments) {
              throw new Error('No tournaments found');
            }
            return {
              count: result.data.eventTournaments.count,
              items: result.data.eventTournaments.rows.map(
                (team) => new EventTournament(team)
              ),
            };
          }),
          tap((eventTournaments) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, eventTournaments);
            }
          })
        );
    }
  }

  makeOfficial(tournament: EventTournament, offical: boolean) {
    tournament.official = offical;
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
            updateEventTournament(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: tournament.id,
            official: offical,
          },
        },
      })
      .subscribe(() => {
        this.update$.next(true);
        this.matSnackBar.open(
          `Tournament ${tournament.name} is ${
            offical ? 'official' : 'unofficial'
          }`,
          'Close',
          {
            duration: 2000,
          }
        );
      });
  }

  async syncEvent(eventTournament: EventTournament) {
    if (!eventTournament.visualCode) {
      this.matSnackBar.open(
        `Tournament ${eventTournament.name} has no visual code, add it via the "add event" button in the overview page.`,
        'Close',
        {
          duration: 2000,
        }
      );

      return;
    }

    await lastValueFrom(
      this.jobsService.syncEventById({ id: eventTournament.visualCode })
    );
  }

  async addEvent() {
    const dialogRef = this.dialog.open(AddEventComponent, {
      width: '400px',
    });

    const result = await lastValueFrom(dialogRef.afterClosed());

    if (result?.id) {
      await lastValueFrom(this.jobsService.syncEventById(result));
    }
  }

  setOpenClose(tournament: EventTournament) {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: { event: tournament },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        tournament.openDate = result.openDate;
        tournament.closeDate = result.closeDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventTournament(
                $data: EventTournamentUpdateInput!
              ) {
                updateEventTournament(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: tournament.id,
                openDate: tournament.openDate,
                closeDate: tournament.closeDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Tournament ${tournament.name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              }
            );
          });
      }
    });
  }
}
