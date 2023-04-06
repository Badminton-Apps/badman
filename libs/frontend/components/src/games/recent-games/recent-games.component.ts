import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { ListEncountersComponent } from './list-encounters/list-encounters.component';
import { ListGamesComponent } from './list-games/list-games.component';

@Component({
  selector: 'badman-recent-games',
  standalone: true,
  imports: [
    CommonModule,
    MomentModule,
    TranslateModule,
    RouterModule,
    ListEncountersComponent,
    ListGamesComponent,
  ],

  templateUrl: './recent-games.component.html',
  styleUrls: ['./recent-games.component.scss'],
})
export class RecentGamesComponent implements OnInit {
  @Input() clubId?: string;
  @Input() teamId?: string;
  @Input() playerId?: string;

  @Input() type: 'encounter' | 'game' = 'encounter';

  @Input() teams!: Team | Team[];

  ngOnInit() {
    if (!this.teamId && !this.clubId && this.teams instanceof Team) {
      this.teamId = this.teams.id;
    }

    if (!this.teamId && !this.clubId && this.playerId) {
      this.type = 'game';
    }
  }
}
