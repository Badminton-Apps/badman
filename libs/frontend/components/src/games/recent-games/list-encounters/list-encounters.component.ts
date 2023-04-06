import { CommonModule, isPlatformServer } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import {
  EncounterCompetition,
  Game,
  GamePlayer,
  Team,
} from '@badman/frontend-models';
import { gameLabel, GameType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { of, map, tap, Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MomentModule,

    // Material modules
    MatButtonModule,
    MatListModule,
  ],
  selector: 'badman-list-encounters',
  templateUrl: './list-encounters.component.html',
  styleUrls: ['./list-encounters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListEncountersComponent implements OnInit {
  @Input() clubId?: string;
  @Input() teamId?: string;
  @Input() teams!: Team | Team[];

  recentEncounters$?: Observable<EncounterCompetition[]>;

  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit() {
    this.recentEncounters$ = this._loadRecentEncounterForTeams(
      Array.isArray(this.teams) ? this.teams : [this.teams]
    );
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getGameLabel(game: Game, encounter: EncounterCompetition) {
    // if game type is M the first 4 games are doubles male, the next 4 are singles male
    // if game type is F the first 4 games are doubles female, the next 4 are singles female
    // if the gametype is MX then first is doubles male, second doubles female, next 2 are singles male, next 2 singles female, next 2 are doubles mixed

    if (!game || !encounter.drawCompetition?.subEventCompetition?.eventType) {
      return null;
    }

    const gameType = encounter.drawCompetition?.subEventCompetition
      ?.eventType as 'M' | 'F' | 'MX';
    const gameNumber = game.order ?? 0;

    return gameLabel(gameType, gameNumber) as string[];
  }

  getRanking(player: GamePlayer, game: Game) {
    if (!game.gameType) return null;

    switch (game.gameType) {
      case GameType.S:
        return player?.single;
      case GameType.D:
        return player?.double;
      case GameType.MX:
        return player?.mix;
    }
  }

  private _loadRecentEncounterForTeams(teams: Team[]) {
    const STATE_KEY = makeStateKey<EncounterCompetition[]>(
      'recentKey-' + this.teamId ?? this.clubId
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((encounter) => new EncounterCompetition(encounter)));
    } else {
      return this.apollo
        .query<{
          encounterCompetitions: {
            rows: Partial<EncounterCompetition>[];
          };
        }>({
          query: gql`
            query RecentGames(
              $where: JSONObject
              $take: Int
              $order: [SortOrderType!]
            ) {
              encounterCompetitions(where: $where, order: $order, take: $take) {
                rows {
                  id
                  date
                  home {
                    id
                    name
                  }
                  away {
                    id
                    name
                  }
                  homeScore
                  awayScore
                  drawCompetition {
                    id
                    subEventCompetition {
                      id
                      eventType
                      eventId
                    }
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              date: {
                $lte: moment().format('YYYY-MM-DD'),
              },
              $or: [
                {
                  homeTeamId: teams.map((team) => team.id),
                },
                {
                  awayTeamId: teams.map((team) => team.id),
                },
              ],
            },
            order: [
              {
                direction: 'desc',
                field: 'date',
              },
            ],
            take: 10,
          },
        })
        .pipe(
          map((result) => {
            return result.data.encounterCompetitions.rows?.map(
              (encounter) => new EncounterCompetition(encounter)
            );
          }),
          tap((encounters) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, encounters);
            }
          })
        );
    }
  }
}
