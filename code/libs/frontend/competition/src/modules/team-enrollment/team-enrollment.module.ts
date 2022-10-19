import { NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  SelctionComponentsModule,
  SharedModule,
} from '@badman/frontend-shared';
import { CompetitionComponentsModule } from '../../components';
import {
  AssignTeamComponent,
  ClubViewComponent,
  SubEventViewComponent,
  TeamEnrollmentComponent,
  TeamEnrollmentsComponent,
} from './pages';
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
  MatInputModule,
  NgxMatTimepickerModule,
  MatOptionModule,
  MatSelectModule,
  MatDatepickerModule,
  MatTabsModule,
  MatExpansionModule,
  OverlayModule,
];

@NgModule({
  declarations: [
    TeamEnrollmentComponent,
    TeamEnrollmentsComponent,
    AssignTeamComponent,

    ClubViewComponent,
    SubEventViewComponent,
  ],
  imports: [
    SharedModule,
    CompetitionComponentsModule,
    TeamEnrolmentRoutingModule,
    SelctionComponentsModule,
    ...materialModules,
  ],
  bootstrap: [],
})
export class TeamEnrolmentModule {}
