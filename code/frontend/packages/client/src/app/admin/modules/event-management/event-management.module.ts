import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { EventCompetitionFieldsComponent, EventTournamentFieldsComponent } from './components';
import { EventCompetitionLevelFieldsComponent } from './components/event-competition-level-fields/event-competition-level-fields.component';
import { EventManagementRoutingModule } from './event-management-routing.module';
import { EditEventCompetitionComponent } from './pages/edit-competition-event';
import { AddEventDialogComponent } from './pages/import/components/add-event.dialog/add-event.dialog.component';
import { UploadFieldComponent } from './pages/import/components/upload-field/upload-field.component';
import { DragOverDirective } from './pages/import/directives/dragover.directive';
import { ImportComponent } from './pages/import/import.component';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSelectModule,
  MatSortModule,
  MatTableModule,
  MatProgressSpinnerModule,
  ReactiveFormsModule,
];

@NgModule({
  declarations: [
    EventCompetitionFieldsComponent,
    EventTournamentFieldsComponent,
    EditEventCompetitionComponent,
    ImportComponent,
    DragOverDirective,
    UploadFieldComponent,
    AddEventDialogComponent,
    EventCompetitionLevelFieldsComponent,
  ],
  imports: [SharedModule, ...materialModules, EventManagementRoutingModule],
})
export class EventManagementModule {}
