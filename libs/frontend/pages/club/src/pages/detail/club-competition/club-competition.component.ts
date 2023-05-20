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
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { provideAnimations } from '@angular/platform-browser/animations';
import { EnrollmentMessageComponent, SelectClubComponent } from '@badman/frontend-components';
import { Club } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { EnrollmentDetailRowDirective } from './competition-enrollments-detail.component';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'badman-club-competition',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatExpansionModule,
    MatCardModule,
    MatRippleModule,
    MatListModule,
    MatTooltipModule,
    MatBadgeModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,

    CdkTableModule,
    CdkTreeModule,
    EnrollmentDetailRowDirective,
    SelectClubComponent,
    EnrollmentMessageComponent
  ],
  templateUrl: './club-competition.component.html',
  styleUrls: ['./club-competition.component.scss'],
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
export class ClubCompetitionComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);

  // signals
  club?: Signal<Club | undefined>;
  loading = signal(false);

  // Inputs
  @Input() filter?: FormGroup;
  @Input({ required: true }) clubId?: string;

  displayedColumns: string[] = ['name', 'subevent', 'validations'];

  ngOnInit(): void {
    this._setTeams();
  }

  private _setTeams(): void {
    this.club = toSignal(
      this.filter?.get('season')?.valueChanges?.pipe(
        startWith(this.filter.value.season ?? {}),
        switchMap((filter) => {
          return this.apollo.watchQuery<{
            club: Partial<Club>;
          }>({
            query: gql`
              query EventEntries(
                $clubId: ID!
                $where: JSONObject
                $order: [SortOrderType!]
              ) {
                club(id: $clubId) {
                  id
                  teams(where: $where, order: $order) {
                    id
                    name
                    entry {
                      id
                      subEventCompetition {
                        id
                        name
                        eventType
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
              clubId: this.clubId,
              order: [
                {
                  field: 'type',
                  direction: 'asc',
                },
                {
                  field: 'teamNumber',
                  direction: 'asc',
                },
              ],
              where: {
                season: filter,
              },
            },
          }).valueChanges;
        }),
        tap(() => {
          this.loading.set(true);
        }),
        map((result) => new Club(result?.data?.club)),
        tap(() => {
          this.loading.set(false);
        })
      ) ?? of(undefined),
      { injector: this.injector }
    );
  }
}
