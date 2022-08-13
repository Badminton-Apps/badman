import { NgModule } from '@angular/core';
import { SharedModule } from '@badman/frontend/shared';

import { MatchFormRoutingModule } from './match-form-routing.module';
import { MatchFormComponent } from './pages';

@NgModule({
  declarations: [MatchFormComponent],
  imports: [SharedModule, MatchFormRoutingModule],
})
export class MatchFormModule {}
