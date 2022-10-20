import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { PlayerInfoModule } from '@badman/frontend-components-player-info';
import { RankingModule } from '@badman/frontend-ranking';
import { TranslateModule } from '@ngx-translate/core';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import {
  GameHistoryComponent,
  GamesHistoryComponent,
} from './components';
import { GameHistoryTitleComponent } from './components';

const materialModules = [
  ReactiveFormsModule,
  FormsModule,

  MatOptionModule,
  MatSelectModule,
  MatTooltipModule,

  FlexLayoutModule,
  RouterModule
];

@NgModule({
  declarations: [
    GamesHistoryComponent,
    GameHistoryComponent,
    GameHistoryTitleComponent,
  ],

  imports: [
    CommonModule,
    ...materialModules,
    InfiniteScrollModule,
    TranslateModule,
    RankingModule,
    PlayerInfoModule,
  ],
  exports: [GamesHistoryComponent],
})
export class GameHistoryModule {}
