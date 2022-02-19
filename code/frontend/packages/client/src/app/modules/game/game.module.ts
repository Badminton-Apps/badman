import { NgModule } from '@angular/core';
import { FlexModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'app/_shared';
import { MomentModule } from 'ngx-moment';
import { PlayerInfoModule } from '../player-info/player-info.module';
import { CompetitionEncounterComponent } from './components/competition-encounter/competition-encounter.component';
import { GameInfoComponent } from './components/game-info/game-info.component';
import { SubEventComponent } from './components/sub-event/sub-event.component';
import { TournamentDrawComponent } from './components/tournament-draw/tournament-draw.component';

@NgModule({
  declarations: [GameInfoComponent, SubEventComponent, TournamentDrawComponent, CompetitionEncounterComponent],
  imports: [
    SharedModule,
    PlayerInfoModule,
    MatExpansionModule,
    FlexModule,
    MomentModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    RouterModule
  ],
  exports: [SubEventComponent, MatExpansionModule],
})
export class GameModule {}
