import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatchFormRoutingModule } from './match-form-routing.module';
import { MatchFormComponent } from './pages/match-form.component';


@NgModule({
  declarations: [MatchFormComponent],
  imports: [
    CommonModule,
    MatchFormRoutingModule
  ]
})
export class MatchFormModule { }
