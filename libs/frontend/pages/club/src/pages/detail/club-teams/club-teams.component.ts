import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  LoadingBlockComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { SubEventTypeEnum, getCurrentSeason, sortTeams } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-club-teams',
  standalone: true,
  imports: [
    CommonModule,
    LoadingBlockComponent,
    RouterModule,
    TranslateModule,

    // Maeterial Modules
    MatIconModule,
    MatButtonModule,
    MatDialogModule,

    // Components
    HasClaimComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './club-teams.component.html',
  styleUrls: ['./club-teams.component.scss'],
})
export class ClubTeamsComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);

  // signals
  teams?: Signal<Team[] | undefined>;
  loading = signal(true);

  // Inputs
  @Input({ required: true }) clubId?: string;
  @Input() filter?: FormGroup;

  // Outputs
  @Output() whenTeamEdit = new EventEmitter<void>();
  @Output() whenTeamAdd = new EventEmitter<void>();

  // Other
  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.filter) {
      this.filter = new FormGroup({
        season: new FormControl(getCurrentSeason()),
      });
    }

    this.teams = toSignal(
      this.filter?.valueChanges?.pipe(
        tap(() => {
          this.loading.set(true);
        }),
        startWith(this.filter.value ?? {}),
        switchMap((filter) => {
          return this.apollo.watchQuery<{ teams: Partial<Team>[] }>({
            query: gql`
              query Teams($teamsWhere: JSONObject) {
                teams(where: $teamsWhere) {
                  id
                  name
                  slug
                  teamNumber
                  season
                  captainId
                  type
                  clubId
                  email
                  phone
                  preferredDay
                  preferredTime
                  entry {
                    id
                    date
                    subEventCompetition {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: {
              teamsWhere: {
                clubId: this.clubId,
                season: filter?.season,
                type: filter?.choices,
              },
            },
          }).valueChanges;
        }),
        transferState(
          `clubTeamsKey-${this.clubId}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => new Team(team));
        }),
        map((teams) => teams.sort(sortTeams)),
        tap(() => {
          this.loading.set(false);
        })
      ) ?? of([]),
      { injector: this.injector }
    );
  }
  editTeam(team: Team) {
    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.EditDialogComponent, {
          data: {
            team: team,
            teamNumbers: {
              [team.type ?? 'M']: this.teams?.()
                ?.filter((t) => t.type == team.type)
                ?.map((t) => t.teamNumber),
            },
          },

          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.whenTeamEdit.emit();
        });
    });
  }

  addTeam() {
    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.AddDialogComponent, {
          data: {
            team: {
              clubId: this.clubId,
              season: this.filter?.value.season,
            },
            teamNumbers: {
              [SubEventTypeEnum.M]: this.teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.M)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.F]: this.teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.F)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.MX]: this.teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.MX)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.NATIONAL]: this.teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.NATIONAL)
                ?.map((t) => t.teamNumber),
            },
          },
          disableClose: true,
          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.whenTeamAdd.emit();
        });
    });
  }
}
