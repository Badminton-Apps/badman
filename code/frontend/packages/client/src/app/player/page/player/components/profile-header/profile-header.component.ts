import { RankingPlace } from '../../../../../_shared/models/ranking-place.model';
import { Player } from './../../../../../_shared/models/player.model';
import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output, OnChanges } from '@angular/core';
import * as moment from 'moment';
import { Club } from 'app/_shared';
import { MatDialog } from '@angular/material/dialog';
import { MergeAccountComponent } from '../../dialogs/merge-account/merge-account.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent implements OnChanges  {
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

  shownRanking?: RankingPlace;
  initials?: string;

  singleTooltip!: string;
  doubleTooltip!: string;
  mixTooltip!: string;

  constructor(private dialog: MatDialog, private translateService: TranslateService) {}

  ngOnChanges(): void {
    this.shownRanking = {
      ...this.player?.lastRanking,
      single: this.player?.lastRanking?.single ?? 12,
      double: this.player?.lastRanking?.double ?? 12,
      mix: this.player?.lastRanking?.mix ?? 12,
    } as RankingPlace;

    const lastNames = this.player.lastName!.split(' ');
    this.initials = `${this.player.firstName![0]}${lastNames[lastNames.length - 1][0]}`.toUpperCase();

    if (this.shownRanking) {
      const date = moment(this.shownRanking.rankingDate);

      var week = `Week: ${date.week()}-${date.weekYear()}`;

      if (this.shownRanking.singleRank != -1) {
        this.singleTooltip = `${this.translateService.instant('ranking.single')}\r\n${week}`;
        if (this.shownRanking.singleRank && this.shownRanking.totalWithinSingleLevel) {
          this.singleTooltip += `\r\nWithin level: ${this.shownRanking.singleRank} of ${this.shownRanking.totalWithinSingleLevel}`;
        }
        if (this.shownRanking.totalSingleRanking) {
          this.singleTooltip += `\r\nTotal: ${this.shownRanking.totalSingleRanking}`;
        }
        if (this.shownRanking.singlePointsDowngrade) {
          this.singleTooltip += `\r\nDown: ${this.shownRanking.singlePointsDowngrade}`;
        }
      }

      if (this.shownRanking.doubleRank != -1) {
        this.doubleTooltip = `${this.translateService.instant('ranking.double')}\r\n${week}`;
        if (this.shownRanking.doubleRank && this.shownRanking.totalWithinDoubleLevel) {
          this.doubleTooltip += `\r\nWithin level: ${this.shownRanking.doubleRank} of ${this.shownRanking.totalWithinDoubleLevel}`;
        }

        if (this.shownRanking.totalDoubleRanking) {
          this.doubleTooltip += `\r\nTotal: ${this.shownRanking.totalDoubleRanking}`;
        }

        if (this.shownRanking.doublePointsDowngrade) {
          this.doubleTooltip += `\r\nDown: ${this.shownRanking.doublePointsDowngrade}`;
        }
      }

      if (this.shownRanking.mixRank != -1) {
        this.mixTooltip = `${this.translateService.instant('ranking.mix')}\r\n${week}`;
        if (this.shownRanking.mixRank && this.shownRanking.totalWithinMixLevel) {
          this.mixTooltip += `\r\nWithin level: ${this.shownRanking.mixRank} of ${this.shownRanking.totalWithinMixLevel}`;
        }
        if (this.shownRanking.totalMixRanking) {
          this.mixTooltip += `\r\nTotal: ${this.shownRanking.totalMixRanking}`;
        }
        if (this.shownRanking.mixPointsDowngrade) {
          this.mixTooltip += `\r\nDown: ${this.shownRanking.mixPointsDowngrade}`;
        }
      }
    }
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
