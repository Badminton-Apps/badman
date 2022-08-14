import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '@badman/frontend/shared';

import { ChangeEncounterComponent } from './pages/change-encounter/change-encounter.component';

const routes: Routes = [
  {
    path: '',
    component: ChangeEncounterComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['*_change:encounter', 'change-any:encounter'],
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChangeEncounterRoutingModule {}
