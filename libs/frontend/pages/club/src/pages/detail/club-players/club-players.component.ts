import {
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { Club, Player } from '@badman/frontend-models';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { transferState } from '@badman/frontend-utils';
import { switchMap, map, startWith } from 'rxjs/operators';
import { of } from 'rxjs';
import { getCurrentSeason } from '@badman/utils';
import { LoadingBlockComponent } from '@badman/frontend-components';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-club-players',
  standalone: true,
  imports: [CommonModule, LoadingBlockComponent, RouterModule, TranslateModule],
  templateUrl: './club-players.component.html',
  styleUrls: ['./club-players.component.scss'],
})
export class ClubPlayersComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  // signals
  players?: Signal<{ player: Player; teams: number }[] | undefined>;

  // Inputs
  @Input({ required: true }) clubId!: Signal<string>;

  @Input() filter?: FormGroup;

  ngOnInit(): void {
    if (!this.filter) {
      this.filter = new FormGroup({
        season: new FormControl(getCurrentSeason()),
      });
    }

    effect(
      () => {
        this.players = toSignal(
          this.filter?.valueChanges?.pipe(
            startWith(this.filter.value ?? {}),
            switchMap((filter) => {
              return this.apollo.watchQuery<{ club: Partial<Club> }>({
                query: gql`
                  query PlayersForTeams($teamsWhere: JSONObject, $clubId: ID!) {
                    club(id: $clubId) {
                      id
                      players {
                        id
                        fullName
                        slug
                        teams(where: $teamsWhere) {
                          id
                        }
                      }
                    }
                  }
                `,
                variables: {
                  clubId: this.clubId(),
                  teamsWhere: {
                    season: filter?.season,
                    type: filter?.choices,
                  },
                },
              }).valueChanges;
            }),
            transferState(
              `clubPlayerTeamsKey-${this.clubId()}`,
              this.stateTransfer,
              this.platformId
            ),
            map((result) => {
              if (!result?.data.club) {
                throw new Error('No club');
              }
              return new Club(result.data.club);
            }),
            map((club) => {
              return (club.players ?? []).map((player) => {
                return {
                  player,
                  teams: (player.teams ?? []).length,
                };
              });
            })
          ) ?? of([]),
          { injector: this.injector }
        );
      },
      { injector: this.injector }
    );
  }
}
