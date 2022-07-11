import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../../_shared';
import { TeamEnrollmentComponent, TeamEnrollmentsComponent } from './pages';

const routes: Routes = [
  {
    path: '',
    component: TeamEnrollmentComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['*_enlist:team', 'enlist-any:team'],
      },
    },
  },
  {
    path: 'list',
    component: TeamEnrollmentsComponent,
    canActivate: [AuthGuard],
    data: {
      claims: {
        any: ['view:entries'],
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamEnrolmentRoutingModule {}
