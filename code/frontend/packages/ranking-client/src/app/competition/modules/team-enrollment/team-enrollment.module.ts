import { NgModule } from '@angular/core';
import { SharedModule } from 'app/_shared';
import { TeamEnrolmentRoutingModule } from './team-enrollment-routing.module';
import { TeamEnrollmentComponent } from './pages/team-enrollment.component';
import { CompetitionComponentsModule } from 'app/competition/components';

@NgModule({
  declarations: [TeamEnrollmentComponent],
  imports: [SharedModule, TeamEnrolmentRoutingModule, CompetitionComponentsModule],
})
export class TeamEnrolmentModule {}
