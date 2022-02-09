import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/_shared';
import { DetailCompetitionComponent, DetailDrawCompetitionComponent, EditEventCompetitionComponent } from './pages';

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
        path: 'edit',
        children: [
          {
            path: '',
            component: EditEventCompetitionComponent,
          },
        ],
        canActivate: [AuthGuard],
        data: {
          claims: {
            any: 'edit:competition',
          },
        },
      },

      {
        path: ':drawId',
        component: DetailDrawCompetitionComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
