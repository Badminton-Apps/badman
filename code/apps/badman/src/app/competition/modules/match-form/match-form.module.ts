import { NgModule } from '@angular/core';
import { SharedModule } from '../../../_shared';

import { MatchFormRoutingModule } from './match-form-routing.module';
import { MatchFormComponent } from './pages/match-form.component';

@NgModule({
  declarations: [MatchFormComponent],
  imports: [SharedModule, MatchFormRoutingModule],
})
export class MatchFormModule {}
