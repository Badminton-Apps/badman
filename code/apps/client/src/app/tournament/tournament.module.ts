import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { GameModule, StandingsModule } from '../modules';
import { SharedModule } from '../_shared';
import {
  DetailDrawTournamentComponent,
  DetailTournamentComponent,
} from './pages';
import { tournamentRoutingModule } from './tournament-routing.module';

const materialModules = [
  MatListModule,
  MatMenuModule,
  MatIconModule,
  MatButtonModule,
];

@NgModule({
  declarations: [DetailTournamentComponent, DetailDrawTournamentComponent],
  imports: [
    SharedModule,
    ...materialModules,
    tournamentRoutingModule,
    GameModule,
    StandingsModule,
  ],
})
export class tournamentModule {}
