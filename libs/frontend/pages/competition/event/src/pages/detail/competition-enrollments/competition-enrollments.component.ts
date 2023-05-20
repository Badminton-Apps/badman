import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  EnrollmentMessageComponent,
  SelectClubComponent,
} from '@badman/frontend-components';
import { EventCompetition } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { EnrollmentDetailRowDirective } from './competition-enrollments-detail.component';

@Component({
  selector: 'badman-competition-enrollments',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatExpansionModule,
    MatCardModule,
    MatRippleModule,
    MatListModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
    TranslateModule,

    CdkTableModule,
    CdkTreeModule,
    EnrollmentDetailRowDirective,
    SelectClubComponent,
    EnrollmentMessageComponent,
  ],
  templateUrl: './competition-enrollments.component.html',
  styleUrls: ['./competition-enrollments.component.scss'],
  providers: [provideAnimations()],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed',
        style({ height: '0px', minHeight: '0', visibility: 'hidden' })
      ),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class CompetitionEnrollmentsComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);

  // signals
  eventCompetition?: Signal<EventCompetition | undefined>;
  loading = signal(false);

  // Form Controls
  clubControl = new FormControl();

  // Inputs
  @Input({ required: true }) eventId?: string;
  @Input() season?: number;

  displayedColumns: string[] = ['name', 'entries', 'validations'];

  ngOnInit(): void {
    this._setTeams();
  }

  private _setTeams(): void {
    this.eventCompetition = toSignal(
      this.clubControl.valueChanges.pipe(
        startWith(this.clubControl.value),
        tap(() => {
          this.loading.set(true);
        }),
        switchMap(
          () =>
            this.apollo.watchQuery<{
              eventCompetition: Partial<EventCompetition>;
            }>({
              query: gql`
                query EventEntries(
                  $eventCompetitionId: ID!
                  $order: [SortOrderType!]
                ) {
                  eventCompetition(id: $eventCompetitionId) {
                    id
                    subEventCompetitions(order: $order) {
                      id
                      name
                      eventType
                      eventEntries {
                        id
                        subEventId
                        team {
                          id
                          name
                          type
                          teamNumber
                          link
                          players {
                            id
                            fullName
                            membershipType
                            teamId
                          }
                          club {
                            id
                            name
                          }
                        }
                        meta {
                          competition {
                            teamIndex
                            players {
                              id
                              player {
                                id
                                fullName
                              }
                              single
                              double
                              mix
                            }
                          }
                        }
                        enrollmentValidation {
                          id
                          linkId
                          teamIndex
                          baseIndex
                          isNewTeam
                          possibleOldTeam
                          maxLevel
                          minBaseIndex
                          maxBaseIndex
                          valid
                          errors {
                            message
                            params
                          }
                          warnings {
                            message
                            params
                          }
                        }
                      }
                    }
                  }
                }
              `,
              variables: {
                eventCompetitionId: this.eventId,
                order: [
                  {
                    field: 'eventType',
                    direction: 'asc',
                  },
                  {
                    field: 'level',
                    direction: 'asc',
                  },
                ],
              },
            }).valueChanges
        ),
        map((result) => {
          if (!this.clubControl.value) {
            return result.data.eventCompetition;
          }

          // Filter out the subEventCompetitions that do not include the selected club
          const filteredSubEventCompetitions =
            result.data.eventCompetition.subEventCompetitions?.filter(
              (subEventCompetition) =>
                subEventCompetition.eventEntries?.some(
                  (eventEntry) =>
                    eventEntry.team?.club?.id === this.clubControl.value
                )
            );

          // Filter the eventEntries within each filtered subEventCompetition
          const filteredEventCompetition = {
            ...result.data.eventCompetition,
            subEventCompetitions: filteredSubEventCompetitions?.map(
              (subEventCompetition) => ({
                ...subEventCompetition,
                eventEntries: subEventCompetition.eventEntries?.filter(
                  (eventEntry) =>
                    eventEntry.team?.club?.id === this.clubControl.value
                ),
              })
            ),
          };

          return filteredEventCompetition;
        }),
        map((result) => new EventCompetition(result)),
        tap(() => {
          this.loading.set(false);
        })
      ),
      { injector: this.injector }
    );
  }

  getValidationsForSubEvent(id: string) {
    const validations =
      this.eventCompetition?.()
        ?.subEventCompetitions?.find(
          (subEventCompetition) => subEventCompetition.id === id
        )
        ?.eventEntries?.map((eventEntry) => eventEntry.enrollmentValidation) ??
      [];

    return {
      errors: validations.filter(
        (validation) => (validation?.errors?.length ?? 0) > 0
      ).length,
      warnings: validations.filter(
        (validation) => (validation?.warnings?.length ?? 0) > 0
      ).length,
    };
  }
}
