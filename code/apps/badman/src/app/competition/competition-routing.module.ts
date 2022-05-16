import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../_shared';
import { DetailCompetitionComponent, DetailDrawCompetitionComponent, EditEventCompetitionComponent } from './pages';
import { DetailEncounterComponent } from './pages/detail-encounter/detail-encounter.component';

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
        children: [
          {
            path: '',
            component: DetailDrawCompetitionComponent,
          },
          {
            path: ':encounterId',
            component: DetailEncounterComponent
          }
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompetitionRoutingModule {}
