import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Apollo, gql, QueryRef } from 'apollo-angular';
import { Player, RankingPlace, SystemService } from 'app/_shared';
import { lastValueFrom, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { EditRankingPlaceDialogComponent } from '../../dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';

@Component({
  selector: 'app-edit-ranking-all',
  templateUrl: './edit-ranking-all.component.html',
  styleUrls: ['./edit-ranking-all.component.scss'],
})
export class EditRankingAllComponent implements OnInit {
  allPlaces$?: Observable<[RankingPlace, RankingPlace[]][]>;
  query$?: QueryRef<{ player: Partial<Player> }, { playerId: string; system: string }>;

  currentOpen?: string;
  systemId!: string;

  @Input()
  player!: Player;

  constructor(private systemService: SystemService, private appollo: Apollo, private dialog: MatDialog) {}

  ngOnInit() {
    this.systemService.getPrimarySystem().subscribe((system) => {
      this.systemId = system!.id!;

      this.query$ = this.appollo.watchQuery<{ player: Partial<Player> }, { playerId: string; system: string }>({
        query: gql`
          query AllRanking($playerId: ID!, $system: String) {
            player(id: $playerId) {
              id
              rankingPlaces(where: { SystemId: $system }) {
                id
                rankingDate
                single
                mix
                double
                singlePoints
                mixPoints
                doublePoints
                updatePossible
              }
            }
          }
        `,
        variables: {
          playerId: this.player.id!,
          system: this.systemId,
        },
      });

      this.allPlaces$ = this.query$!.valueChanges.pipe(
        filter(({ data, loading }) => !loading && !!data),
        map(({ data }) => new Player(data.player)),
        map((player) => {
          const allPlaces: Map<Date, RankingPlace[]> = new Map();
          allPlaces[Symbol.iterator] = function* () {
            yield* [...allPlaces.entries()].sort((a, b) => b[0].getTime() - a[0].getTime());
          };

          const sorted = player.rankingPlaces?.sort((a, b) => {
            return b.rankingDate!.getTime() - a.rankingDate!.getTime();
          });

          let currUpdateDate: Date | null = null;

          for (const place of sorted ?? []) {
            if (place.updatePossible) {
              allPlaces.set(place.rankingDate!, [place]);
              currUpdateDate = place.rankingDate ?? null;
            } else {
              const oldPlace = allPlaces.get(currUpdateDate!);
              if (oldPlace) {
                allPlaces.set(currUpdateDate!, [...oldPlace, place]);
              } else {
                allPlaces.set(currUpdateDate!, [place]);
              }
            }
          }

          const returnBlock: [RankingPlace, RankingPlace[]][] = [];

          for (const [date, places] of allPlaces) {
            returnBlock.push([places.find((p) => p.updatePossible)!, places!]);
          }

          return returnBlock;
        })
      );
    });
  }

  editRanking(place?: RankingPlace) {
    this.dialog
      .open(EditRankingPlaceDialogComponent, {
        data: {
          place: {
            ...place,
            playerId: this.player.id,
            SystemId: this.systemId,
          },
        },
      })
      .afterClosed()
      .subscribe((result: { action?: 'update' | 'remove' | 'add'; place: RankingPlace }) => {
        if (result?.action) {
          lastValueFrom(
            this.appollo.mutate({
              mutation: gql`
                mutation UpdateRankingPlace($rankingPlace: RankingPlaceInput!) {
                  ${result!.action}RankingPlace(rankingPlace: $rankingPlace) {
                    id
                  }
                }
              `,
              variables: {
                rankingPlace: result.place,
              },
            })
          ).then((_) => this.query$?.refetch());
        }
      });
  }
}
