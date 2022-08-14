import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend/models';
import { SystemService } from '@badman/frontend/shared';
import { map, Observable, switchMap } from 'rxjs';
import { MergeAccountComponent } from '../../dialogs';

@Component({
  selector: 'badman-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent implements OnChanges {
  @Input()
  player!: Player;

  @Input()
  canClaimAccount!: {
    canClaim?: boolean;
    isUser?: boolean;
  } | null;

  @Output()
  claimAccount = new EventEmitter<string>();

  @Output()
  accountMerged = new EventEmitter<void>();

  places$?: Observable<{
    shownRankingPrimary?: RankingPlace;
    shownRanking?: RankingPlace;
  }>;

  systems$?: Observable<RankingSystem[]>;
  initials?: string;

  constructor(
    private dialog: MatDialog,
    private apollo: Apollo,
    private systemService: SystemService
  ) {}

  ngOnChanges(): void {
    this.systems$ = this.systemService.getPrimarySystemsWhere().pipe(
      switchMap((query) => {
        const where: { [key: string]: unknown } = {};

        if (!query.primary) {
          where['$or'] = [
            {
              primary: true,
            },
            {
              id: query.id,
            },
          ];
        } else {
          where['primary'] = true;
        }

        return this.apollo.query<{ rankingSystems: Partial<RankingSystem>[] }>({
          query: gql`
            query GetSystems($where: JSONObject) {
              rankingSystems(where: $where) {
                id
                primary
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
              }
            }
          `,
          variables: {
            where,
          },
        });
      }),
      map((x) => x.data.rankingSystems?.map((x) => new RankingSystem(x)))
    );

    this.places$ = this.systems$.pipe(
      switchMap((systems) => {
        return this.apollo.query<{ player: Player }>({
          query: gql`
            query GetRankingPlacesForSystems(
              $playerId: ID!
              $where: JSONObject
            ) {
              player(id: $playerId) {
                id
                rankingLastPlaces(where: $where) {
                  id
                  rankingDate
                  single
                  singleRank
                  singlePoints
                  singlePointsDowngrade
                  singleInactive
                  totalSingleRanking
                  totalWithinSingleLevel
                  mix
                  mixRank
                  mixPoints
                  mixPointsDowngrade
                  mixInactive
                  totalMixRanking
                  totalWithinMixLevel
                  double
                  doubleRank
                  doublePoints
                  doublePointsDowngrade
                  doubleInactive
                  totalDoubleRanking
                  totalWithinDoubleLevel
                  rankingSystem {
                    id
                    primary
                  }
                }
              }
            }
          `,
          variables: {
            playerId: this.player.id,

            where: {
              systemId: {
                $in: systems?.map((x) => x.id),
              },
            },
          },
        });
      }),
      map((player) => {
        return player.data?.player.rankingLastPlaces?.map(
          (x) => new RankingPlace(x)
        );
      }),
      map((places) => {
        if ((places?.length ?? 0) > 2) {
          console.warn('Loading more then 2 systems??');
        }
        const primary = places?.find((x) => x.rankingSystem?.primary);
        const secondary = places?.find((x) => !x.rankingSystem?.primary);
        let shownRankingPrimary: RankingPlace | undefined;
        let shownRanking: RankingPlace | undefined;

        if (primary) {
          shownRankingPrimary = {
            ...primary,
            single: primary?.single ?? 12,
            double: primary?.double ?? 12,
            mix: primary?.mix ?? 12,
            singlePoints: primary?.singlePoints ?? 0,
            doublePoints: primary?.doublePoints ?? 0,
            mixPoints: primary?.mixPoints ?? 0,
          } as RankingPlace;
        }

        if (secondary) {
          shownRanking = {
            ...secondary,
            single: secondary?.single ?? 12,
            double: secondary?.double ?? 12,
            mix: secondary?.mix ?? 12,
            singlePoints: secondary?.singlePoints ?? 0,
            doublePoints: secondary?.doublePoints ?? 0,
            mixPoints: secondary?.mixPoints ?? 0,
          } as RankingPlace;
        }

        const lastNames = this.player.lastName?.split(' ');

        if ((lastNames ?? []).length > 0) {
          this.initials = `${this.player.firstName?.[0]}${
            lastNames?.[lastNames.length - 1][0]
          }`.toUpperCase();
        }
        return {
          shownRankingPrimary,
          shownRanking,
        };
      })
    );
  }

  mergePlayer() {
    this.dialog
      .open(MergeAccountComponent, {
        data: {
          player: this.player,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.accountMerged.emit();
        }
      });
  }
}
