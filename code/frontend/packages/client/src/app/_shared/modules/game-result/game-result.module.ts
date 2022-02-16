import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexModule } from '@angular/flex-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GameResultComponent } from './game-result';
import { PlayerInfoComponent } from './player-info';

@NgModule({
  declarations: [
    GameResultComponent,
    PlayerInfoComponent,
  ],
  imports: [CommonModule, MatTooltipModule, RouterModule, TranslateModule, FlexModule],
  exports: [GameResultComponent],
})
export class GameResultModule {}
