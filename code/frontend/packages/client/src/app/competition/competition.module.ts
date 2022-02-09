import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { GameModule } from 'app/modules/game';
import { StandingsModule } from 'app/modules/standings/standings.module';
import { SharedModule } from 'app/_shared';
import { CompetitionRoutingModule } from './competition-routing.module';
import { EventCompetitionFieldsComponent, EventCompetitionLevelFieldsComponent } from './components';
import { DetailCompetitionComponent, DetailDrawCompetitionComponent, EditEventCompetitionComponent } from './pages';

const materialModules = [MatListModule, MatMenuModule, MatButtonModule, MatIconModule, MatTabsModule, MatSelectModule];

@NgModule({
  declarations: [
    DetailCompetitionComponent,
    DetailDrawCompetitionComponent,
    EditEventCompetitionComponent,
    EventCompetitionFieldsComponent,
    EditEventCompetitionComponent,
    EventCompetitionLevelFieldsComponent,
  ],
  imports: [SharedModule, ...materialModules, CompetitionRoutingModule, GameModule, StandingsModule],
})
export class CompetitionModule {}
