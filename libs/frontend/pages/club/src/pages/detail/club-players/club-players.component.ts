import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  TransferState,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoadingBlockComponent, SelectSeasonComponent } from '@badman/frontend-components';
import { Club, Player } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { combineLatest } from 'rxjs';
import { filter, map, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'badman-club-players',
  standalone: true,
  imports: [
    CommonModule,
    LoadingBlockComponent,
    RouterModule,
    TranslateModule,
    SelectSeasonComponent,
  ],
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
  players = signal<
    {
      player: Player;
      teams: number;
    }[]
  >([]);

  // Inputs
  clubId = input.required<string>();
  filter = input<FormGroup>(
    new FormGroup({
      season: new FormControl(getCurrentSeason()),
    }),
  );

  ngOnInit(): void {
    combineLatest([
      this.filter()?.valueChanges.pipe(startWith(this.filter().value ?? {})),
      toObservable(this.clubId, {
        injector: this.injector,
      }),
    ])
      .pipe(
        filter(([, clubId]) => !!clubId),
        switchMap(
          ([filter, clubId]) =>
            this.apollo.watchQuery<{ club: Partial<Club> }>({
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
                clubId,
                teamsWhere: {
                  season: filter?.season,
                  type: filter?.choices,
                },
              },
            }).valueChanges,
        ),
        transferState(`clubPlayerTeamsKey-${this.clubId()}`, this.stateTransfer, this.platformId),
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
        }),
      )
      .subscribe((players) => {
        if (!players) {
          return;
        }

        this.players.set(players);
      });
  }
}
