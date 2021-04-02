import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { EventRoutingModule } from './event-routing.module';
import { OverviewComponent } from './pages';
import {
  CompetitionDataComponent,
  tournamentsDataComponent,
} from './pages/overview/components';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSelectModule,
  MatSortModule,
  MatTableModule,
  ReactiveFormsModule,
];

@NgModule({
  declarations: [
    OverviewComponent,
    CompetitionDataComponent,
    tournamentsDataComponent,
  ],
  imports: [SharedModule, ...materialModules, EventRoutingModule],
})
export class EventModule {}
