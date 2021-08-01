import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangeEncounterComponent } from './pages/change-encounter/change-encounter.component';

const routes: Routes = [{ path: '', component: ChangeEncounterComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChangeEncounterRoutingModule { }
