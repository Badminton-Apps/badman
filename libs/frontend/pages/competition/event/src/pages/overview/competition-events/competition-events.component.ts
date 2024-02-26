import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import {
  BadmanBlockModule,
  HasClaimComponent,
  LoadingBlockComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { EventCompetition } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { RisersFallersDialogComponent } from '../../../dialogs';

@Component({
  selector: 'badman-competition-events',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    HasClaimComponent,
    LoadingBlockComponent,
    BadmanBlockModule,
  ],
  templateUrl: './competition-events.component.html',
  styleUrls: ['./competition-events.component.scss'],
})
export class CompetitionEventsComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  jobsService = inject(JobsService);

  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  changeDetectorRef = inject(ChangeDetectorRef);

  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  // signals
  events?: Signal<EventCompetition[] | undefined>;
  loading = signal(false);

  // Inputs
  filter = input<
    FormGroup<{
      season: FormControl<number | null>;
      official: FormControl<boolean | null>;
    }>
  >();
  protected internalFilter!: FormGroup<{
    season: FormControl<number | null>;
    official: FormControl<boolean | null>;
  }>;

  // Other
  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.filter() != undefined) {
      this.internalFilter = this.internalFilter as FormGroup<{
        season: FormControl<number | null>;
        official: FormControl<boolean | null>;
      }>;
    }

    if (!this.internalFilter) {
      this.internalFilter = new FormGroup({
        season: new FormControl(getCurrentSeason()),
        official: new FormControl(true),
      });
    }

    this.events = toSignal(
      this.internalFilter?.valueChanges?.pipe(
        tap(() => {
          this.loading.set(true);
        }),
        startWith(this.internalFilter.value ?? {}),
        switchMap((filter) => {
          return this.apollo.watchQuery<{
            eventCompetitions: {
              rows: Partial<EventCompetition>[];
              count: number;
            };
          }>({
            query: gql`
              query GetEventsCompetition($where: JSONObject, $order: [SortOrderType!]) {
                eventCompetitions(where: $where, order: $order) {
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
                season: filter?.season ? filter.season : undefined,
              },
              order: [
                {
                  direction: 'desc',
                  field: 'official',
                },
                {
                  direction: 'desc',
                  field: 'name',
                },
              ],
            },
          }).valueChanges;
        }),
        transferState(
          `competitions-${this.internalFilter?.value.official ?? true}`,
          this.stateTransfer,
          this.platformId,
        ),
        map((result) => {
          if (!result?.data.eventCompetitions) {
            throw new Error('No competitions found');
          }
          return result.data.eventCompetitions.rows.map((team) => new EventCompetition(team));
        }),
        tap(() => {
          this.loading.set(false);
        }),
      ) ?? of([]),
      { injector: this.injector },
    );
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
              mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
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
            this.snackBar.open(
              `Competition ${competition.name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              },
            );
            this.changeDetectorRef.detectChanges();
          });
      }
    });
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
        this.snackBar.open(
          `Competition ${competition.name} is ${offical ? 'official' : 'unofficial'}`,
          'Close',
          {
            duration: 2000,
          },
        );

        this.changeDetectorRef.detectChanges();
      });
  }

  async syncEvent(competition: EventCompetition) {
    if (!competition.visualCode) {
      console.warn('No visual code');
      return;
    }

    await lastValueFrom(this.jobsService.syncEventById({ id: competition.visualCode }));
  }
}
