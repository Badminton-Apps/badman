import { NgModule } from '@angular/core';
import { MomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GameResultModule,
  SelctionComponentsModule,
  SharedModule,
} from '@badman/frontend/shared';
import { MomentModule } from 'ngx-moment';
import {
  ChartComponent,
  EditClubHistoryComponent,
  EditClubHistoryDialogComponent,
  EditCompetitionStatusComponent,
  EditPermissionsComponent,
  EditPlayerComponent,
  EditPlayerFieldsComponent,
  EditRankingAllComponent,
  EditRankingComponent,
  MergeAccountComponent,
  MergePlayerComponent,
  PlayerComponent,
  ProfileHeaderComponent,
  RankingEvolutionComponent,
  TopPlayersComponent,
} from './page';
import { EditRankingPlaceDialogComponent } from './page/edit-player/dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';
import { ShowRankingComponent } from './page/player';
import {
  ListGamesComponent,
  PeriodSelectionComponent,
  RankingBreakdownComponent,
} from './page/ranking-breakdown';
import { AddGameComponent } from './page/ranking-breakdown/dialogs/add-game/add-game.component';
import { PlayerRoutingModule } from './player-routing.module';

import { GameHistoryModule } from '@badman/frontend/components/game-history';
import { PlayerSearchModule } from '@badman/frontend/components/player-search';
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentLineEchartsModule } from '@covalent/echarts/line';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';

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
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatSelectModule,
  MatExpansionModule,
  MatDialogModule,
  MatSlideToggleModule,
  MatDatepickerModule,
];

const otherModules = [
  MomentDateModule,
  MomentModule,
  SelctionComponentsModule,
  CovalentBaseEchartsModule,
  CovalentLineEchartsModule,
  CovalentTooltipEchartsModule,
];

const ownModules = [PlayerSearchModule, GameHistoryModule];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPermissionsComponent,
    EditPlayerFieldsComponent,
    EditRankingComponent,
    EditRankingAllComponent,
    PlayerComponent,
    ProfileHeaderComponent,
    RankingEvolutionComponent,
    TopPlayersComponent,
    ChartComponent,
    MergeAccountComponent,
    MergePlayerComponent,
    EditCompetitionStatusComponent,
    EditClubHistoryComponent,
    EditClubHistoryDialogComponent,
    RankingBreakdownComponent,
    ListGamesComponent,
    PeriodSelectionComponent,
    AddGameComponent,
    EditRankingPlaceDialogComponent,
    ShowRankingComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    ...otherModules,
    ...ownModules,
    GameResultModule,
    PlayerRoutingModule,
  ],
})
export class PlayerModule {}
