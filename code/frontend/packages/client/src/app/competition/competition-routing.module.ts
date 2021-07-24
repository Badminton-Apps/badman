import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { DetailCompetitionComponent } from './pages';

const routes: Routes = [
  {
    path: 'team-assembly',
    loadChildren: () => import('./modules/team-assembly/team-assembly.module').then((m) => m.TeamAssemblyModule),
  },
  {
    path: 'team-enrollment',
    loadChildren: () => import('./modules/team-enrollment/team-enrollment.module').then((m) => m.TeamEnrolmentModule),
  },
  {
    path: 'change-encounter',
    loadChildren: () =>
      import('./modules/change-encounter/change-encounter.module').then((m) => m.ChangeEncoutnerModule),
  },
  {
    path: ':id',
    component: DetailCompetitionComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
