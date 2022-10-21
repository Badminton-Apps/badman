import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  OnChanges,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  map,
  mergeMap,
  Observable,
  scan,
  tap,
  throttleTime,
} from 'rxjs';

@Component({
  selector: 'badman-games-history',
  templateUrl: './games-history.component.html',
  styleUrls: ['./games-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesHistoryComponent implements OnInit, OnChanges {
  @Input()
  playerId!: string;

  gameFilter = new FormGroup({
    gameType: new FormControl(undefined),
    eventType: new FormControl(undefined),
  });

  batch = 20;
  curr = 0;
  theEnd = false;

  offset = new BehaviorSubject<number>(0);
  infinite?: Observable<
    {
      id: string;
      linkId: string | undefined;
      linkType: string | undefined;
      playedAt: Date | undefined;
      first: boolean;
    }[]
  >;

  constructor(private apollo: Apollo) {}

  ngOnChanges() {
    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n) => this.getBatch(n)),
      scan((acc, batch) => {
        return [...acc, ...batch];
      }, [] as { id: string; linkId: string | undefined; linkType: string | undefined; playedAt: Date | undefined; first: boolean }[])
    );

    this.infinite = batchMap.pipe(map((v) => v));
  }

  ngOnInit(): void {
    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n) => this.getBatch(n)),
      scan((acc, batch) => {
        return [...acc, ...batch];
      }, [] as { id: string; linkId: string | undefined; linkType: string | undefined; playedAt: Date | undefined; first: boolean }[])
    );

    this.infinite = batchMap.pipe(map((v) => v));

    this.gameFilter.valueChanges.subscribe(() => {
      this.offset.next(0);
      this.infinite = batchMap.pipe(map((v) => v));
    });
  }

  getBatch(offset: number) {
    return this.apollo
      .query<{ player: Partial<Player> }>({
        fetchPolicy: 'network-only',
        query: gql`
          query Games(
            $playerId: ID!
            $where: JSONObject
            $skip: Int
            $take: Int
            $order: [SortOrderType!]
          ) {
            player(id: $playerId) {
              id
              games(where: $where, skip: $skip, take: $take, order: $order) {
                id
                linkId
                linkType
                playedAt
              }
            }
          }
        `,
        variables: {
          playerId: this.playerId,
          where: {
            gameType: this.gameFilter.get('gameType')?.value ?? undefined,
            linkType: this.gameFilter.get('eventType')?.value ?? undefined,
          },
          skip: offset,
          take: this.batch,
          order: [
            {
              field: 'playedAt',
              direction: 'DESC',
            },
          ],
        },
      })

      .pipe(
        map((result) => {
          const games = result.data?.player?.games;
          return games?.map((game) => new Game(game));
        }),
        tap((arr) => (arr?.length ? null : (this.theEnd = true))),
        map((arr) => {
          if (!arr) {
            return [];
          }
          this.curr = arr.length;

          return arr.reduce(
            (acc, curr) => {
              if (!curr.id) {
                return [...acc];
              }

              const newItem = {
                id: curr.id,
                first: false,
                linkId: curr.linkId,
                linkType: curr.linkType,
                playedAt: curr.playedAt,
              };

              // find highest index of item with same linkId
              const idx = acc.findIndex((item) => item.linkId === curr.linkId);

              // if index found insert after
              if (idx !== -1) {
                return [
                  ...acc.slice(0, idx + 1),
                  newItem,
                  ...acc.slice(idx + 1),
                ];
              }

              newItem.first = true;
              return [...acc, newItem];
            },
            [] as {
              id: string;
              linkId: string | undefined;
              linkType: string | undefined;
              playedAt: Date | undefined;
              first: boolean;
            }[]
          );
        })
      );
  }

  nextBatch() {
    if (this.theEnd) {
      return;
    }

    this.offset.next(this.curr + this.batch);
  }

  trackByIdx(i: number) {
    return i;
  }
}
