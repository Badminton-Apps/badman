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
import {
  EventCompetitionFieldsComponent,
  EventCompetitionLevelFieldsComponent,
} from './components';
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
    EventCompetitionFieldsComponent,
    EditEventCompetitionComponent,
    EventCompetitionLevelFieldsComponent,
    DetailEncounterComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    GameResultModule,
    CompetitionRoutingModule,
    GameModule,
    StandingsModule,
  ],
})
export class CompetitionModule {}
