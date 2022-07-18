import { NgModule } from '@angular/core';
import { FlexModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { GameModule, StandingsModule } from '../modules';
import { GameResultModule, SharedModule } from '../_shared';
import { CompetitionRoutingModule } from './competition-routing.module';
import { CompetitionComponentsModule } from './components';
import {
  DetailCompetitionComponent,
  DetailDrawCompetitionComponent,
  EditEventCompetitionComponent,
} from './pages';
import { DetailEncounterComponent } from './pages';

const materialModules = [
  MatListModule,
  MatMenuModule,
  MatButtonModule,
  MatIconModule,
  MatTabsModule,
  MatSelectModule,
  FlexModule,
];

@NgModule({
  declarations: [
    DetailCompetitionComponent,
    DetailDrawCompetitionComponent,
    EditEventCompetitionComponent,
    EditEventCompetitionComponent,
    DetailEncounterComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    CompetitionComponentsModule,
    GameResultModule,
    CompetitionRoutingModule,
    GameModule,
    StandingsModule,
  ],
})
export class CompetitionModule {}
