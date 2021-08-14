import { NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompetitionComponentsModule } from 'app/competition/components';
import { SharedModule } from 'app/_shared';
import { MomentModule } from 'ngx-moment';
import { ChangeEncounterRoutingModule } from './change-encounter-routing.module';
import { ChangeEncounterComponent, ListEncountersComponent, ShowRequestsComponent } from './pages';

const materialModules = [
  DragDropModule,
  MatCardModule,
  MatIconModule,
  MatButtonModule,
  MatProgressBarModule,
  MatSelectModule,
  MatTooltipModule,
  MatDialogModule,
  MatCheckboxModule,
  MatListModule,
  ReactiveFormsModule,
  FormsModule,
  MomentModule,
  MatInputModule,
  NgxMatDatetimePickerModule,
  MatDatepickerModule,
];

@NgModule({
  declarations: [ChangeEncounterComponent, ListEncountersComponent, ShowRequestsComponent],
  imports: [SharedModule, CompetitionComponentsModule, ChangeEncounterRoutingModule, ...materialModules]
})
export class ChangeEncoutnerModule {}
