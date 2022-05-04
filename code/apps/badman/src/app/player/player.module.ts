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
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentLineEchartsModule } from '@covalent/echarts/line';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MomentModule } from 'ngx-moment';
import { GameResultModule, SelctionComponentsModule, SharedModule } from '../_shared';
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
  GamesComponent,
  MergeAccountComponent,
  MergePlayerComponent,
  PlayerComponent,
  ProfileHeaderComponent,
  RankingEvolutionComponent,
  TopPlayersComponent,
  GamesResultComponent,
  GroupCompetitionComponent,
  GroupTournamentComponent
} from './page';
import { EditRankingPlaceDialogComponent } from './page/edit-player/dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';
import { ListGamesComponent, PeriodSelectionComponent, RankingBreakdownComponent } from './page/ranking-breakdown';
import { AddGameComponent } from './page/ranking-breakdown/dialogs/add-game/add-game.component';
import { PlayerRoutingModule } from './player-routing.module';
import { ShowRankingComponent } from './page/player';

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

const covalentModules = [CovalentBaseEchartsModule, CovalentLineEchartsModule, CovalentTooltipEchartsModule];

const otherModules = [MomentDateModule, MomentModule, InfiniteScrollModule, SelctionComponentsModule];

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
    GamesComponent,
    ChartComponent,
    MergeAccountComponent,
    MergePlayerComponent,
    EditCompetitionStatusComponent,
    EditClubHistoryComponent,
    EditClubHistoryDialogComponent,
    RankingBreakdownComponent,
    ListGamesComponent,
    GamesResultComponent,
    GroupCompetitionComponent,
    GroupTournamentComponent,
    PeriodSelectionComponent,
    AddGameComponent,
    EditRankingPlaceDialogComponent,
    ShowRankingComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    ...covalentModules,
    ...otherModules,
    GameResultModule,
    PlayerRoutingModule,
  ],
})
export class PlayerModule {}
