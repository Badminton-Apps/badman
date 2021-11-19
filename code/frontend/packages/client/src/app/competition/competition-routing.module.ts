import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { DetailCompetitionComponent } from './pages';
import { DetailSubEventCompetitionComponent } from './pages/detail-sub-event-competition/detail-sub-event-competition.component';

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
    children: [
      {
        path: '',
        component: DetailCompetitionComponent,
      },
      {
        path: ':subEvent',
        component: DetailSubEventCompetitionComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
 