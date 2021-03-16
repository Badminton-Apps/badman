import { NgModule } from '@angular/core';
import { SharedModule } from 'app/_shared';
import { TeamEnrolmentRoutingModule } from './team-enrollment-routing.module';
import { TeamEnrollmentComponent } from './pages/team-enrollment.component';
import { CompetitionComponentsModule } from 'app/competition/components';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AssignTeamComponent } from './pages/components/assign-team/assign-team.component';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

const materialModules = [DragDropModule, MatCardModule];

@NgModule({
  declarations: [TeamEnrollmentComponent, AssignTeamComponent],
  imports: [
    SharedModule,
    TeamEnrolmentRoutingModule,
    CompetitionComponentsModule,
    materialModules
  ],
})
export class TeamEnrolmentModule {}
