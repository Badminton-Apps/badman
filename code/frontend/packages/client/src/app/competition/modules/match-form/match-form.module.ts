import { NgModule } from '@angular/core';

import { MatchFormRoutingModule } from './match-form-routing.module';
import { MatchFormComponent } from './pages/match-form.component';
import { SharedModule } from 'app/_shared';


@NgModule({
  declarations: [MatchFormComponent],
  imports: [
    SharedModule,
    MatchFormRoutingModule
  ]
})
export class MatchFormModule { }
