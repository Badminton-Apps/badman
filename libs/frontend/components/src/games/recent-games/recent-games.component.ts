import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
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
export class RecentGamesComponent {
  teams = input<Team | Team[]>();
  clubId = input<string>();
  playerId = input<string>();

  typeInput = input<'encounter' | 'game'>();
  type = computed(() =>
    this.typeInput() ?? (!this.clubId() && this.playerId()) ? 'game' : 'encounter',
  );
}
