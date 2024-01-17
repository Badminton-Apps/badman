import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, Input, OnInit, PLATFORM_ID, TransferState } from '@angular/core';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChartComponent } from './components';

@Component({
  selector: 'badman-ranking-evolution',
  templateUrl: './ranking-evolution.component.html',
  styleUrls: ['./ranking-evolution.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, TranslateModule, ChartComponent],
})
export class RankingEvolutionComponent implements OnInit {
  @Input()
  player!: Player;

  @Input()
  system!: RankingSystem;

  rankingPlaces$?: Observable<{
    single: rankingPlace[];
    mix: rankingPlace[];
    double: rankingPlace[];
  }>;

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: string,
    private stateTransfer: TransferState,
    private apollo: Apollo,
  ) {}

  ngOnInit(): void {
    this.rankingPlaces$ = this._loadRankingPlaces().pipe(
      map((x) => {
        if (x == null) {
          throw new Error('invalid evolution');
        }

        return x.reduce(
          (
            acc: {
              single: rankingPlace[];
              mix: rankingPlace[];
              double: rankingPlace[];
            },
            value,
          ) => {
            return {
              single: [
                ...acc.single,
                {
                  level: value.single,
                  rankingDate: value.rankingDate,
                  points: value.singlePoints,
                  pointsDowngrade: value.singlePointsDowngrade,
                  updatePossible: value.updatePossible,
                } as rankingPlace,
              ],
              double: [
                ...acc.double,
                {
                  level: value.double,
                  rankingDate: value.rankingDate,
                  points: value.doublePoints,
                  pointsDowngrade: value.doublePointsDowngrade,
                  updatePossible: value.updatePossible,
                } as rankingPlace,
              ],
              mix: [
                ...acc.mix,
                {
                  level: value.mix,
                  rankingDate: value.rankingDate,
                  points: value.mixPoints,
                  pointsDowngrade: value.mixPointsDowngrade,
                  updatePossible: value.updatePossible,
                } as rankingPlace,
              ],
            };
          },
          { single: [], double: [], mix: [] },
        );
      }),
    );
  }

  private _loadRankingPlaces() {
    return this.apollo
      .query<{ player: Partial<Player> }>({
        query: gql`
          # Write your query or mutation here
          query GetPlayerEvolutionQuery($playerId: ID!, $rankingType: ID!) {
            player(id: $playerId) {
              id
              rankingPlaces(where: { systemId: $rankingType }) {
                id
                rankingDate
                singlePoints
                singlePointsDowngrade
                single
                mixPoints
                mixPointsDowngrade
                mix
                doublePoints
                doublePointsDowngrade
                double
                updatePossible
              }
            }
          }
        `,
        variables: {
          playerId: this.player.id,
          rankingType: this.system.id,
        },
      })
      .pipe(
        transferState(
          'player-ranking-places' + this.player.id + this.system.id + '-state',
          this.stateTransfer,
          this.platformId,
        ),
        map((x) => x?.data?.player),
        map((x) => x?.rankingPlaces?.map((x) => new RankingPlace(x))),
      );
  }
}

interface rankingPlace {
  level: number;
  rankingDate: Date;
  points: number;
  pointsDowngrade: number;
  updatePossible: boolean;
}
