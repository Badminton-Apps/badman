import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
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
import { SelctionComponentsModule, SharedModule } from 'app/_shared';
import { AssignTeamComponent } from './pages';
import { TeamEnrollmentComponent } from './pages/team-enrollment/team-enrollment.component';
import { TeamEnrolmentRoutingModule } from './team-enrollment-routing.module';
import { LocationAvailabilityComponent } from './pages/team-enrollment/components/location-availability/location-availability.component';
import { PlayDaysComponent } from './pages/team-enrollment/components/play-days/play-days.component';
import { NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

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
  MatInputModule,
  NgxMatTimepickerModule,
  MatOptionModule,
  MatSelectModule
];

@NgModule({
  declarations: [TeamEnrollmentComponent, AssignTeamComponent, LocationAvailabilityComponent, PlayDaysComponent],
  imports: [SharedModule, TeamEnrolmentRoutingModule, SelctionComponentsModule, ...materialModules],
})
export class TeamEnrolmentModule {}
