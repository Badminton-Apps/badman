import { NgModule } from '@angular/core';
import { FlexModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@badman/frontend-shared';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import {
  CompetitionEncounterComponent,
  GameInfoComponent,
  SubEventComponent,
  TournamentDrawComponent,
} from './components';

@NgModule({
  declarations: [
    GameInfoComponent,
    SubEventComponent,
    TournamentDrawComponent,
    CompetitionEncounterComponent,
  ],
  imports: [
    SharedModule,
    MatExpansionModule,
    FlexModule,
    MomentModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    RouterModule,
  ],
  exports: [SubEventComponent, MatExpansionModule],
})
export class GameModule {}
