import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Game } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    this.game$ = this.apollo
      .query<{ game: Partial<Game> }>({
        query: gql`
          query Game($gameId: ID!) {
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
                single
                double
                mix
              }
            }
          }
        `,
        variables: {
          gameId: this.gameId,
        },
      })
      .pipe(map((result) => new Game(result.data.game)));
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRankingPoint(game: Game, playerId: string) {
    return game.rankingPoints?.find((p) => p.playerId === playerId);
  }
}
