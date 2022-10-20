import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@badman/frontend-authentication';

const routes: Routes = [
  {
    path: 'ranking',
    loadChildren: () =>
      import('./modules/ranking-management/ranking-management.module').then(
        (m) => m.RankingManagementModule
      ),
    canActivate: [AuthGuard],
    data: {
      claims: {
        all: 'view:ranking',
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
