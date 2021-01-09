import { NgModule } from '@angular/core';
import { SharedModule } from 'app/_shared';
import { TeamEnrolmentRoutingModule } from './team-enrollment-routing.module';
import { TeamEnrollmentComponent } from './pages/team-enrollment.component';

@NgModule({
  declarations: [TeamEnrollmentComponent],
  imports: [SharedModule, TeamEnrolmentRoutingModule],
})
export class TeamEnrolmentModule {}
