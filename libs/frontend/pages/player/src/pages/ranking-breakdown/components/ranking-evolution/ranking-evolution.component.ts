import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  TransferState,
  input,
  inject,
} from '@angular/core';
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
    imports: [CommonModule, TranslateModule, ChartComponent]
})
export class RankingEvolutionComponent implements OnInit {
  private platformId = inject<string>(PLATFORM_ID);
  private stateTransfer = inject(TransferState);
  private apollo = inject(Apollo);
  player = input.required<Player>();

  system = input.required<RankingSystem>();

  rankingPlaces$?: Observable<{
    single: RankingPlaceDetail[];
    mix: RankingPlaceDetail[];
    double: RankingPlaceDetail[];
  }>;

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.rankingPlaces$ = this._loadRankingPlaces().pipe(
      map((x) => {
        if (x == null) {
          throw new Error('invalid evolution');
        }

        return x.reduce(
          (
            acc: {
              single: RankingPlaceDetail[];
              mix: RankingPlaceDetail[];
              double: RankingPlaceDetail[];
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
                } as RankingPlaceDetail,
              ],
              double: [
                ...acc.double,
                {
                  level: value.double,
                  rankingDate: value.rankingDate,
                  points: value.doublePoints,
                  pointsDowngrade: value.doublePointsDowngrade,
                  updatePossible: value.updatePossible,
                } as RankingPlaceDetail,
              ],
              mix: [
                ...acc.mix,
                {
                  level: value.mix,
                  rankingDate: value.rankingDate,
                  points: value.mixPoints,
                  pointsDowngrade: value.mixPointsDowngrade,
                  updatePossible: value.updatePossible,
                } as RankingPlaceDetail,
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
          query GetPlayerEvolutionQuery($playerId: ID!, $where: JSONObject) {
            player(id: $playerId) {
              id
              rankingPlaces(where: $where) {
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
                systemId
              }
            }
          }
        `,
        variables: {
          playerId: this.player().id,
          where: {
            systemId: this.system().id,
          },
        },
      })
      .pipe(
        transferState(
          'player-ranking-places' + this.player().id + this.system().id + '-state',
          this.stateTransfer,
          this.platformId,
        ),
        map((x) => x?.data?.player),
        map((x) => x?.rankingPlaces?.map((x) => new RankingPlace(x))),
      );
  }
}

interface RankingPlaceDetail {
  level: number;
  rankingDate: Date;
  points: number;
  pointsDowngrade: number;
  updatePossible: boolean;
}
