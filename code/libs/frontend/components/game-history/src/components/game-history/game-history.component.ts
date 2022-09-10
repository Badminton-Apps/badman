import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Game } from '@badman/frontend/models';
import { SystemService } from '@badman/frontend/ranking';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'badman-game-history',
  templateUrl: './game-history.component.html',
  styleUrls: ['./game-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameHistoryComponent implements OnInit {
  @Input()
  gameId!: string;

  game$?: Observable<Partial<Game>>;

  constructor(private apollo: Apollo, private systemService: SystemService) {}

  ngOnInit(): void {
    this.game$ = this.systemService.getPrimarySystemId().pipe(
      switchMap((system) =>
        this.apollo.query<{ game: Partial<Game> }>({
          query: gql`
            query Game($gameId: ID!, $systemId: ID!) {
              game(id: $gameId) {
                id
                gameType
                set1Team1
                set1Team2
                set2Team1
                set2Team2
                set3Team1
                set3Team2
                winner
                playedAt
                rankingPoints {
                  id
                  points
                  differenceInLevel
                  playerId
                }
                players {
                  id
                  team
                  player
                  fullName
                  slug
                  rankingPlace(where: { systemId: $systemId }) {
                    id
                    single
                    double
                    mix
                    rankingDate
                  }
                }
              }
            }
          `,
          variables: {
            gameId: this.gameId,
            systemId: system,
          },
        })
      ),
      map((result) => new Game(result.data.game))
    );
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRankingPoint(game: Game, playerId: string) {
    return game.rankingPoints?.find((p) => p.playerId === playerId);
  }
}
