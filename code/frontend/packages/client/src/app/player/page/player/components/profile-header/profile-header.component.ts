import { RankingPlace } from '../../../../../_shared/models/ranking-place.model';
import { Player } from './../../../../../_shared/models/player.model';
import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output, OnChanges } from '@angular/core';
import * as moment from 'moment';
import { Club, RankingSystem, SystemService } from 'app/_shared';
import { MatDialog } from '@angular/material/dialog';
import { MergeAccountComponent } from '../../dialogs/merge-account/merge-account.component';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent implements OnChanges {
  @Input()
  player!: Player;

  playerAge?: number;

  menuItesm = [];

  @Input()
  canClaimAccount!: {
    canClaim?: boolean;
    isClaimedByUser?: boolean;
    isUser?: boolean;
  } | null;

  @Output()
  claimAccount = new EventEmitter<string>();

  @Output()
  accountMerged = new EventEmitter<void>();

  // shownRankingPrimary?: RankingPlace;
  // shownRanking?: RankingPlace;
  places$?: Observable<{
    shownRankingPrimary: RankingPlace;
    shownRanking?: RankingPlace;
  }>;

  initials?: string;

  singleTooltip!: string;
  doubleTooltip!: string;
  mixTooltip!: string;

  constructor(
    private dialog: MatDialog,
    private translateService: TranslateService,
    private apollo: Apollo,
    private systemService: SystemService
  ) {}

  ngOnChanges(): void {
    this.places$ = this.systemService.getPrimarySystemsWhere().pipe(
      switchMap((query) => {
        const where = {};

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

        return this.apollo.query<{ systems: Partial<RankingSystem>[] }>({
          query: gql`
            query GetSystems($where: SequelizeJSON) {
              systems(where: $where) {
                id
                primary
              }
            }
          `,
          variables: {
            where,
          },
        });
      }),
      switchMap((systems) => {
        return this.apollo.query<{ player: Player }>({
          query: gql`
            query GetRankingPlacesForSystems($playerId: ID!, $where: SequelizeJSON) {
              player(id: $playerId) {
                id
                lastRankingPlaces(where: $where) {
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
                    name
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
                $in: systems?.data?.systems?.map((x) => x.id),
              },
            },
          },
        });
      }),
      map((player) => {
        return player.data?.player.lastRankingPlaces;
      }),
      map((places) => {
        if ((places?.length ?? 0) > 2) {
          console.warn('Loading more then 2 systems??');
        }
        const primary = places?.find((x) => x.rankingSystem?.primary);
        const secondary = places?.find((x) => !x.rankingSystem?.primary);

        const shownRankingPrimary = {
          ...primary,
          single: primary?.single ?? 12,
          double: primary?.double ?? 12,
          mix: primary?.mix ?? 12,
        } as RankingPlace;

        let shownRanking: RankingPlace | undefined;
        if (secondary) {
          shownRanking = {
            ...secondary,
            single: secondary?.single ?? 12,
            double: secondary?.double ?? 12,
            mix: secondary?.mix ?? 12,
          } as RankingPlace;
        }

        const lastNames = this.player.lastName!.split(' ');
        this.initials = `${this.player.firstName![0]}${lastNames[lastNames.length - 1][0]}`.toUpperCase();

        return {
          shownRankingPrimary,
          shownRanking,
        };
      }),
      tap((data) => {
        const usedRanking = data.shownRanking ?? data.shownRankingPrimary;

        if (usedRanking) {
          const date = moment(usedRanking.rankingDate);

          var week = `Week: ${date.week()}-${date.weekYear()}`;

          if (usedRanking.singleRank != -1) {
            this.singleTooltip = `${this.translateService.instant('ranking.single')}\r\n${week}`;
            if (usedRanking.singleRank && usedRanking.totalWithinSingleLevel) {
              this.singleTooltip += `\r\nWithin level: ${usedRanking.singleRank} of ${usedRanking.totalWithinSingleLevel}`;
            }
            if (usedRanking.totalSingleRanking) {
              this.singleTooltip += `\r\nTotal: ${usedRanking.totalSingleRanking}`;
            }
            if (usedRanking.singlePointsDowngrade) {
              this.singleTooltip += `\r\nDown: ${usedRanking.singlePointsDowngrade}`;
            }
          }

          if (usedRanking.doubleRank != -1) {
            this.doubleTooltip = `${this.translateService.instant('ranking.double')}\r\n${week}`;
            if (usedRanking.doubleRank && usedRanking.totalWithinDoubleLevel) {
              this.doubleTooltip += `\r\nWithin level: ${usedRanking.doubleRank} of ${usedRanking.totalWithinDoubleLevel}`;
            }

            if (usedRanking.totalDoubleRanking) {
              this.doubleTooltip += `\r\nTotal: ${usedRanking.totalDoubleRanking}`;
            }

            if (usedRanking.doublePointsDowngrade) {
              this.doubleTooltip += `\r\nDown: ${usedRanking.doublePointsDowngrade}`;
            }
          }

          if (usedRanking.mixRank != -1) {
            this.mixTooltip = `${this.translateService.instant('ranking.mix')}\r\n${week}`;
            if (usedRanking.mixRank && usedRanking.totalWithinMixLevel) {
              this.mixTooltip += `\r\nWithin level: ${usedRanking.mixRank} of ${usedRanking.totalWithinMixLevel}`;
            }
            if (usedRanking.totalMixRanking) {
              this.mixTooltip += `\r\nTotal: ${usedRanking.totalMixRanking}`;
            }
            if (usedRanking.mixPointsDowngrade) {
              this.mixTooltip += `\r\nDown: ${usedRanking.mixPointsDowngrade}`;
            }
          }
        }
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
