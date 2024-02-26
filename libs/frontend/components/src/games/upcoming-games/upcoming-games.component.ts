import { CommonModule } from '@angular/common';
import { Component, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

import { input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { TrackByProp } from 'ngxtension/trackby-id-prop';
import { LoadingBlockComponent } from '../../loading-block';
import { UpcommingGamesService } from './upcomming-games.service';

@Component({
  selector: 'badman-upcoming-games',
  standalone: true,
  imports: [
    TrackByProp,
    CommonModule,
    MatListModule,
    MomentModule,
    TranslateModule,
    MatButtonModule,
    RouterModule,
    LoadingBlockComponent,
  ],
  templateUrl: './upcoming-games.component.html',
  styleUrls: ['./upcoming-games.component.scss'],
})
export class UpcomingGamesComponent implements OnInit, OnChanges {
  upcommingGames = inject(UpcommingGamesService);

  clubId = input<string>();
  teams = input<Team | Team[]>();

  ngOnInit() {
    this._setIds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      !changes['clubid']?.previousValue &&
      !changes['teamId']?.previousValue &&
      !changes['teams']?.previousValue
    ) {
      return;
    }

    // Reset the list when the id changes
    if (
      changes['clubid']?.currentValue !== changes['clubid']?.previousValue ||
      changes['teamId']?.currentValue !== changes['teamId']?.previousValue ||
      JSON.stringify(changes['teams']?.currentValue) !==
        JSON.stringify(changes['teams']?.previousValue)
    ) {
      this._setIds();
    }
  }

  private _setIds() {
    const teamids: string[] = [];

    if (this.teams() instanceof Team && (this.teams() as Team).id) {
      teamids.push((this.teams() as Team).id);
    }

    if (this.teams() instanceof Array) {
      teamids.push(...(this.teams() as Team[]).map((t) => t.id ?? ''));
    }
    this.upcommingGames.filter.setValue({
      teamIds: teamids,
      clubId: this.clubId() ?? '',
    });
  }

  loadMore() {
    this.upcommingGames.pagination$.next(this.upcommingGames.page() + 1);
  }
}
