import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentPagingModule } from '@covalent/core/paging';
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentLineEchartsModule } from '@covalent/echarts/line';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SharedModule } from '../_shared';
import { ProfileComponent } from './page';
import {
  ChartComponent,
  GameResultComponent,
  GamesComponent,
  GamesResultComponent,
  PlayerComponent,
  PlayerInfoComponent,
  ProfileHeaderComponent,
  RankingEvolutionComponent,
} from './page/player';
import { TopPlayersComponent } from './page/top-players/top-players.component';
import { PlayerRoutingModule } from './player-routing.module';
import { GroupCompetitionComponent } from './page/player/components/games/components/games-result/group-competition/group-competition.component';
import { GroupTournamentComponent } from './page/player/components/games/components/games-result/group-tournament/group-tournament.component';

const coreModules = [FormsModule];
const materialModules = [
  MatCardModule,
  MatIconModule,
  MatButtonModule,
  MatTooltipModule,
  MatListModule,
  MatMenuModule,
  MatProgressBarModule,
  MatSnackBarModule,
  MatTabsModule,
  MatSelectModule,
  MatExpansionModule,
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentLineEchartsModule,
  CovalentTooltipEchartsModule,
  CovalentDataTableModule,
  CovalentPagingModule,
];

const otherModules = [MomentDateModule, InfiniteScrollModule];

@NgModule({
  declarations: [
    ProfileComponent,
    PlayerComponent,
    GameResultComponent,
    GamesResultComponent,
    PlayerInfoComponent,
    ProfileHeaderComponent,
    RankingEvolutionComponent,
    TopPlayersComponent,
    GamesComponent,
    ChartComponent,
    GroupCompetitionComponent,
    GroupTournamentComponent,
  ],
  imports: [
    SharedModule,
    ...coreModules,
    ...materialModules,
    ...covalentModules,
    ...otherModules,
    PlayerRoutingModule,
  ],
})
export class PlayerModule {}
