import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { EventRoutingModule } from './event-routing.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AddEventDialogComponent,
  DragOverDirective,
  ImportComponent,
  OverviewComponent,
  UploadFieldComponent,
} from './pages';
import { CompetitionDataComponent, tournamentsDataComponent } from './pages/overview/components';

const materialModules = [
  MatButtonModule,
  MatCheckboxModule,
  MatIconModule,
  MatInputModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSelectModule,
  MatSortModule,
  MatTableModule,
  MatDialogModule,
  MatProgressSpinnerModule,
];

@NgModule({
  declarations: [
    OverviewComponent,
    CompetitionDataComponent,
    tournamentsDataComponent,
    ImportComponent,
    DragOverDirective,
    UploadFieldComponent,
    AddEventDialogComponent,
  ],
  imports: [SharedModule, ...materialModules, EventRoutingModule],
})
export class EventModule {}
