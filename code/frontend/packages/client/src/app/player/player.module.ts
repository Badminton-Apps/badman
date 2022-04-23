import { NgModule } from '@angular/core';
import { MomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { GameResultModule, SelctionComponentsModule } from 'app/_shared';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MomentModule } from 'ngx-moment';
import { SharedModule } from '../_shared';
import {
  AddGameComponent,
  ChartComponent,
  EditClubHistoryComponent,
  EditClubHistoryDialogComponent,
  EditCompetitionStatusComponent,
  EditPermissionsComponent,
  EditPlayerComponent,
  EditPlayerFieldsComponent,
  EditRankingAllComponent,
  EditRankingComponent,
  EditRankingPlaceDialogComponent,
  GamesComponent,
  GamesResultComponent,
  GroupCompetitionComponent,
  GroupTournamentComponent,
  LinkAccountComponent,
  ListGamesComponent,
  MergeAccountComponent,
  MergePlayerComponent,
  PeriodSelectionComponent,
  PlayerComponent,
  ProfileHeaderComponent,
  RankingBreakdownComponent,
  RankingEvolutionComponent,
  ShowRankingComponent,
  TopPlayersComponent,
} from './pages';
import { PlayerRoutingModule } from './player-routing.module';

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
  MatCheckboxModule,
];

const covalentModules = [CovalentBaseEchartsModule, CovalentLineEchartsModule, CovalentTooltipEchartsModule];

const otherModules = [MomentDateModule, MomentModule, InfiniteScrollModule, SelctionComponentsModule];

@NgModule({
  declarations: [
    LinkAccountComponent,
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
