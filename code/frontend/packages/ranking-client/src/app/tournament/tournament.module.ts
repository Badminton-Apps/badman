import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { tournamentRoutingModule } from './tournament-routing.module';
import { SharedModule } from '../_shared';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { DetailTournamentComponent } from './pages';

const materialModules = [MatListModule, MatMenuModule, MatIconModule];

@NgModule({
  declarations: [DetailTournamentComponent],
  imports: [SharedModule, ...materialModules, tournamentRoutingModule],
})
export class tournamentModule {}
