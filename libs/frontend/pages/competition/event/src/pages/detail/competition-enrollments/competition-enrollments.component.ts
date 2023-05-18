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
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { EnrollmentDetailRowDirective } from './competition-enrollments-detail.component';
import { MatListModule } from '@angular/material/list';
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

    CdkTableModule,
    CdkTreeModule,
    EnrollmentDetailRowDirective,
  ],
  templateUrl: './competition-enrollments.component.html',
  styleUrls: ['./competition-enrollments.component.scss'],
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

  // Inputs
  @Input({ required: true }) eventId?: string;
  @Input() season?: number;

  displayedColumns: string[] = ['name'];

  ngOnInit(): void {
    this._setTeams();
  }

  private _setTeams(): void {
    this.eventCompetition = toSignal(
      this.apollo
        .watchQuery<{ eventCompetition: Partial<EventCompetition> }>({
          query: gql`
            query EventEntries($eventCompetitionId: ID!) {
              eventCompetition(id: $eventCompetitionId) {
                id
                subEventCompetitions {
                  id
                  name
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
          },
        })
        .valueChanges.pipe(
          map((result) => new EventCompetition(result.data.eventCompetition))
        ),
      { injector: this.injector }
    );
  }
}
