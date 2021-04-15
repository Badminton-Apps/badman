import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompetitionComponentsModule } from 'app/competition/components';
import { SharedModule } from 'app/_shared';
import { AssignTeamComponent } from './pages/components/assign-team/assign-team.component';
import { TeamEnrollmentComponent } from './pages/team-enrollment.component';
import { TeamEnrolmentRoutingModule } from './team-enrollment-routing.module';

const materialModules = [
  DragDropModule,
  MatCardModule,
  MatIconModule,
  MatStepperModule,
  MatButtonModule,
  MatProgressBarModule,
  MatTooltipModule,
  MatDialogModule,
  MatCheckboxModule,
  MatListModule,
  ReactiveFormsModule,
  FormsModule,
  MatInputModule
];

@NgModule({
  declarations: [TeamEnrollmentComponent, AssignTeamComponent],
  imports: [
    SharedModule,
    TeamEnrolmentRoutingModule,
    CompetitionComponentsModule,
    ...materialModules,
  ],
})
export class TeamEnrolmentModule {}
