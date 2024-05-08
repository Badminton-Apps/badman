import { animate, state, style, transition, trigger } from '@angular/animations';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Injector, OnInit, Signal, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  BadmanBlockModule,
  EnrollmentMessageComponent,
  LoadingBlockComponent,
  SelectClubComponent,
} from '@badman/frontend-components';
import { EventCompetition, EventEntry, TeamValidationResult } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { from } from 'rxjs';
import { bufferCount, concatMap, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
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
    BadmanBlockModule,
    LoadingBlockComponent,
  ],
  templateUrl: './competition-enrollments.component.html',
  styleUrls: ['./competition-enrollments.component.scss'],
  providers: [provideAnimations()],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class CompetitionEnrollmentsComponent implements OnInit {
  // injects
  private apollo = inject(Apollo);
  private injector = inject(Injector);
  private destroy$ = injectDestroy();

  // signals
  eventCompetition?: Signal<EventCompetition | undefined>;
  loading = signal(false);

  validationsForTeam = new Map<string, TeamValidationResult>();
  validationsForSubevent = new Map<
    string,
    {
      errors: number;
      warnings: number;
    }
  >();

  loadingValidations = signal(false);
  progress = signal(0);
  total = signal(0);

  // Form Controls
  clubControl = new FormControl();

  // Inputs
  eventId = input.required<string>();
  season = input<number | undefined>();

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
                query EventEntries($eventCompetitionId: ID!, $order: [SortOrderType!]) {
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
                          preferredDay
                          preferredTime
                          prefferedLocationId
                          captain {
                            id
                            fullName
                          }

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
                      }
                    }
                  }
                }
              `,
              variables: {
                eventCompetitionId: this.eventId(),
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
            }).valueChanges,
        ),
        map((result) => {
          if (!this.clubControl.value) {
            return result.data.eventCompetition;
          }

          // Filter out the subEventCompetitions that do not include the selected club
          const filteredSubEventCompetitions =
            result.data.eventCompetition.subEventCompetitions?.filter((subEventCompetition) =>
              subEventCompetition.eventEntries?.some(
                (eventEntry) => eventEntry.team?.club?.id === this.clubControl.value,
              ),
            );

          // Filter the eventEntries within each filtered subEventCompetition
          const filteredEventCompetition = {
            ...result.data.eventCompetition,
            subEventCompetitions: filteredSubEventCompetitions?.map((subEventCompetition) => ({
              ...subEventCompetition,
              eventEntries: subEventCompetition.eventEntries?.filter(
                (eventEntry) => eventEntry.team?.club?.id === this.clubControl.value,
              ),
            })),
          };

          return filteredEventCompetition;
        }),
        map((result) => new EventCompetition(result)),
        tap(() => {
          this.loading.set(false);
        }),
      ),
      { injector: this.injector },
    );

    effect(
      () => {
        this.loadingValidations.set(true);
        const eventIds = (this.eventCompetition?.()
          ?.subEventCompetitions?.map((subEvent) => subEvent.eventEntries?.map((entry) => entry.id))
          ?.flat()
          ?.filter((id) => !!id) ?? []) as string[];

        this.total.set(eventIds.length);

        from(eventIds)
          .pipe(
            bufferCount(10),
            concatMap((txn) => this.getValidationsForEventEntry(txn)),
            takeUntil(this.destroy$),
          )
          .subscribe((results) => {
            this.progress.set(this.progress() + results.length);

            for (const result of results) {
              if (!result || !result.teamId || !result.subEventId || !result.enrollmentValidation) {
                continue;
              }
              this.validationsForTeam.set(result.teamId, result.enrollmentValidation);

              const subEventValidation = this.validationsForSubevent.get(result.subEventId);

              this.validationsForSubevent.set(result.subEventId, {
                errors:
                  (subEventValidation?.errors ?? 0) + result.enrollmentValidation.errors.length,
                warnings:
                  (subEventValidation?.warnings ?? 0) + result.enrollmentValidation.warnings.length,
              });
            }

            if (this.progress() === this.total()) {
              this.loadingValidations.set(false);
            }
          });
      },
      {
        injector: this.injector,
        allowSignalWrites: true,
      },
    );
  }

  getValidationsForEventEntry(ids: string[]) {
    return this.apollo
      .query<{
        eventEntries: Partial<EventEntry>[];
      }>({
        query: gql`
          query EventEntries($where: JSONObject) {
            eventEntries(where: $where) {
              id
              teamId
              subEventId
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
        `,
        variables: {
          where: {
            id: ids,
          },
        },
      })
      .pipe(map((result) => result.data.eventEntries));
  }
  getValidationsForSubEvent(id: string) {
    const validations =
      this.eventCompetition?.()
        ?.subEventCompetitions?.find((subEventCompetition) => subEventCompetition.id === id)
        ?.eventEntries?.map((eventEntry) => eventEntry.enrollmentValidation) ?? [];

    return {
      errors: validations.filter((validation) => (validation?.errors?.length ?? 0) > 0).length,
      warnings: validations.filter((validation) => (validation?.warnings?.length ?? 0) > 0).length,
    };
  }
}
