import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
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
import { SharedModule } from '@badman/frontend/shared';

import { EventManagementRoutingModule } from './event-management-routing.module';
import { AddEventDialogComponent } from './pages/import/components/add-event.dialog/add-event.dialog.component';
import { UploadFieldComponent } from './pages/import/components/upload-field/upload-field.component';
import { DragOverDirective } from './pages/import/directives/dragover.directive';
import { ImportComponent } from './pages/import/import.component';

const materialModules = [
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
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
];

@NgModule({
  declarations: [
    ImportComponent,
    DragOverDirective,
    UploadFieldComponent,
    AddEventDialogComponent,
  ],
  imports: [SharedModule, ...materialModules, EventManagementRoutingModule],
})
export class EventManagementModule {}
