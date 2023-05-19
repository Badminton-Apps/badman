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
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map, startWith, switchMap } from 'rxjs/operators';
import { EnrollmentDetailRowDirective } from './competition-enrollments-detail.component';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { SelectClubComponent } from '@badman/frontend-components';
import { FormControl } from '@angular/forms';
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
    TranslateModule,

    CdkTableModule,
    CdkTreeModule,
    EnrollmentDetailRowDirective,
    SelectClubComponent,
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
  clubControl = new FormControl();

  // Inputs
  @Input({ required: true }) eventId?: string;
  @Input() season?: number;

  displayedColumns: string[] = ['name', 'entries'];

  ngOnInit(): void {
    this._setTeams();
  }

  private _setTeams(): void {
    this.eventCompetition = toSignal(
      this.clubControl.valueChanges.pipe(
        startWith(this.clubControl.value),
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
                        team {
                          id
                          name
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

          // filter out the teams that are not from the selected club
          const subEventCompetitions =
            result.data.eventCompetition.subEventCompetitions?.filter(
              (subEventCompetition) =>
                subEventCompetition.eventEntries?.some(
                  (eventEntry) =>
                    eventEntry.team?.club?.id === this.clubControl.value
                )
            );

          return {
            ...result.data.eventCompetition,
            subEventCompetitions,
          };
        }),
        map((result) => new EventCompetition(result))
      ),
      { injector: this.injector }
    );
  }
}
