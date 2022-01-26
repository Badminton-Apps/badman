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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentPagingModule } from '@covalent/core/paging';
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentLineEchartsModule } from '@covalent/echarts/line';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';
import { SelctionComponentsModule } from 'app/_shared';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MomentModule } from 'ngx-moment';
import { SharedModule } from '../_shared';
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
  GameResultComponent,
  GamesComponent,
  GamesResultComponent,
  GroupCompetitionComponent,
  GroupTournamentComponent,
  MergeAccountComponent,
  MergePlayerComponent,
  PlayerComponent,
  PlayerInfoComponent,
  ProfileComponent,
  ProfileHeaderComponent,
  RankingEvolutionComponent,
  TopPlayersComponent,
} from './page';
import { ListGamesComponent, PeriodSelectionComponent, RankingBreakdownComponent } from './page/ranking-breakdown';
import { PlayerRoutingModule } from './player-routing.module';
import { AddGameComponent } from './page/ranking-breakdown/dialogs/add-game/add-game.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { EditRankingPlaceDialogComponent } from './page/edit-player/dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';

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
  MatDatepickerModule
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentLineEchartsModule,
  CovalentTooltipEchartsModule,
];

const otherModules = [MomentDateModule, MomentModule, InfiniteScrollModule, SelctionComponentsModule];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPermissionsComponent,
    EditPlayerFieldsComponent,
    EditRankingComponent,
    EditRankingAllComponent,
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
  ],
  imports: [SharedModule, ...materialModules, ...covalentModules, ...otherModules, PlayerRoutingModule],
})
export class PlayerModule {}
