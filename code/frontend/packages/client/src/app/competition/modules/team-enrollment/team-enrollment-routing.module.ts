import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TeamEnrollmentComponent } from './pages/team-enrollment.component';

const routes: Routes = [{ path: '', component: TeamEnrollmentComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamEnrolmentRoutingModule {}
