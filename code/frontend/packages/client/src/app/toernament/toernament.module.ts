import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ToernamentRoutingModule } from './toernament-routing.module';
import { ToernamentComponent } from './toernament.component';
import { TournamentListComponent } from './pages/tournament-list/tournament-list.component';
import { SharedModule } from '../_shared';


@NgModule({
  declarations: [ToernamentComponent, TournamentListComponent],
  imports: [
    SharedModule,
    ToernamentRoutingModule
  ]
})
export class ToernamentModule { }
