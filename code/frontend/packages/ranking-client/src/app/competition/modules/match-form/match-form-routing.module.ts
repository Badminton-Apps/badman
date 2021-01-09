import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MatchFormComponent } from './pages/match-form.component';

const routes: Routes = [{ path: '', component: MatchFormComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MatchFormRoutingModule { }
