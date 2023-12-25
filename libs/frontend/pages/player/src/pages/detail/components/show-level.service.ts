import { Injectable, computed, inject } from '@angular/core';
import { Player, RankingPlace } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface LevelState {
  rankingPlace: RankingPlace | null;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShowLevelService {
  apollo = inject(Apollo);

  initialState: LevelState = {
    rankingPlace: null,
    loaded: false,
  };

  rankingSystem = computed(() => this.state().rankingPlace?.rankingSystem);

  // sources
  state = signalSlice({
    initialState: this.initialState,
    actionSources: {
      getRanking: (
        _state,
        action$: Observable<{
          id: string;
          systemId: string;
        }>,
      ) =>
        action$.pipe(
          switchMap(({ id, systemId }) =>
            this.apollo.query<{
              player: Player;
            }>({
              query: gql`
                query GetPlayerLevel($id: ID!, $systemId: ID!) {
                  player(id: $id) {
                    id
                    rankingLastPlaces(where: { systemId: $systemId }) {
                      id
                      single
                      singlePoints
                      double
                      doublePoints
                      mix
                      mixPoints
                      systemId
                      __typename
                    }
                    __typename
                  }
                }
              `,
              variables: {
                id,
                systemId,
              },
            }),
          ),
          map((res) => res.data?.player),
          map((player) => ({
            rankingPlace: player?.rankingLastPlaces?.[0]
              ? new RankingPlace(player.rankingLastPlaces[0])
              : null,
            loaded: true,
          })),
        ),
    },
  });
}
