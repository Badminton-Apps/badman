import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/_shared';

import { TeamEnrollmentComponent } from './pages/team-enrollment/team-enrollment.component';

const routes: Routes = [
  {
    path: '',
    component: TeamEnrollmentComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: [
          // '*_enlist:team',
          'enlist-any:team',
        ],
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamEnrolmentRoutingModule {}
