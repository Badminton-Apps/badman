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
  EditCompetitionStatusComponent,
  EditPermissionsComponent,
  EditPlayerComponent,
  EditPlayerFieldsComponent,
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
  EditClubHistoryDialogComponent,
} from './page';
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
  MatSelectModule,
  MatExpansionModule,
  MatDialogModule,
  MatSlideToggleModule,
  MatDatepickerModule,
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentLineEchartsModule,
  CovalentTooltipEchartsModule,
  CovalentDataTableModule,
  CovalentPagingModule,
];

const otherModules = [MomentDateModule, MomentModule, InfiniteScrollModule, SelctionComponentsModule];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPermissionsComponent,
    EditPlayerFieldsComponent,
    EditRankingComponent,
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
  ],
  imports: [SharedModule, ...materialModules, ...covalentModules, ...otherModules, PlayerRoutingModule],
})
export class PlayerModule {}
