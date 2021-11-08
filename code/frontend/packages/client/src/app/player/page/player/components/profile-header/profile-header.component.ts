import { RankingPlace } from '../../../../../_shared/models/ranking-place.model';
import { Player } from './../../../../../_shared/models/player.model';
import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import * as moment from 'moment';
import { Club } from 'app/_shared';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent implements OnInit {
  @Input()
  player!: Player;

  @Input()
  mobile!: boolean;

  playerAge?: number;

  @Input()
  canClaimAccount!: {
    canClaim?: boolean;
    isClaimedByUser?: boolean;
    isUser?: boolean;
  } | null;

  @Output()
  claimAccount = new EventEmitter<string>();

  shownRanking?: RankingPlace;
  initials?: string;

  singleTooltip!: string;
  doubleTooltip!: string;
  mixTooltip!: string;

  playerClub?: Club;

  constructor() {}

  ngOnInit(): void {
    this.shownRanking = {
      ...this.player?.lastRanking,
      single: this.player?.lastRanking?.single ?? 12,
      double: this.player?.lastRanking?.double ?? 12,
      mix: this.player?.lastRanking?.mix ?? 12
    } as RankingPlace;

    const lastNames = this.player.lastName!.split(' ');
    this.initials = `${this.player.firstName![0]}${lastNames[lastNames.length - 1][0]}`.toUpperCase();

    if (this.shownRanking) {
      const date = moment(this.shownRanking.rankingDate);

      var week = `Week: ${date.week()}-${date.weekYear()}`;

      if (this.shownRanking.doubleRank != -1) {
        this.doubleTooltip = week;
        if (this.shownRanking.doubleRank && this.shownRanking.totalWithinDoubleLevel) {
          this.doubleTooltip += `\r\nWithin level: ${this.shownRanking.doubleRank} of ${this.shownRanking.totalWithinDoubleLevel}`;
        }
        if (this.shownRanking.totalDoubleRanking) {
          this.doubleTooltip += `\r\nTotal: ${this.shownRanking.totalDoubleRanking}`;
        }
        if (this.shownRanking.doublePoints && this.shownRanking.doublePointsDowngrade) {
          this.doubleTooltip += `\r\nUp: ${this.shownRanking.doublePoints}, down: ${this.shownRanking.doublePointsDowngrade}`;
        } else if (this.shownRanking.doublePoints) {
          this.doubleTooltip += `\r\nUp: ${this.shownRanking.doublePoints}`;
        }
      }

      if (this.shownRanking.mixRank != -1) {
        this.mixTooltip = week;
        if (this.shownRanking.mixRank && this.shownRanking.totalWithinMixLevel) {
          this.mixTooltip += `\r\nWithin level: ${this.shownRanking.mixRank} of ${this.shownRanking.totalWithinMixLevel}`;
        }
        if (this.shownRanking.totalMixRanking) {
          this.mixTooltip += `\r\nTotal: ${this.shownRanking.totalMixRanking}`;
        }
        if (this.shownRanking.mixPoints && this.shownRanking.mixPointsDowngrade) {
          this.mixTooltip += `\r\nUp: ${this.shownRanking.mixPoints}, down: ${this.shownRanking.mixPointsDowngrade}`;
        } else if (this.shownRanking.mixPoints) {
          this.mixTooltip += `\r\nUp: ${this.shownRanking.mixPoints}`;
        }
      }

      if (this.shownRanking.singleRank != -1) {
        this.singleTooltip = week;
        if (this.shownRanking.singleRank && this.shownRanking.totalWithinSingleLevel) {
          this.singleTooltip += `\r\nWithin level: ${this.shownRanking.singleRank} of ${this.shownRanking.totalWithinSingleLevel}`;
        }
        if (this.shownRanking.totalSingleRanking) {
          this.singleTooltip += `\r\nTotal: ${this.shownRanking.totalSingleRanking}`;
        }
        if (this.shownRanking.singlePoints && this.shownRanking.singlePointsDowngrade) {
          this.singleTooltip += `\r\nUp: ${this.shownRanking.singlePoints}, down: ${this.shownRanking.singlePointsDowngrade}`;
        } else if (this.shownRanking.singlePoints) {
          this.singleTooltip += `\r\nUp: ${this.shownRanking.singlePoints}`;
        }
      }
    }

    if (this.player.clubs) {
      this.playerClub = this.player.clubs[0];
    }
  }
}
