import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { SharedModule } from 'app/_shared';
import { CompetitionRoutingModule } from './competition-routing.module';
import { DetailCompetitionComponent } from './pages';
import { DetailSubEventCompetitionComponent } from './pages/detail-sub-event-competition/detail-sub-event-competition.component';

const materialModules = [
  MatListModule,
  MatMenuModule,
  MatButtonModule,
  MatIconModule,
];

@NgModule({
  declarations: [DetailCompetitionComponent, DetailSubEventCompetitionComponent],
  imports: [SharedModule, ...materialModules, CompetitionRoutingModule],
})
export class CompetitionModule {}
