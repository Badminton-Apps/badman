import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentBarEchartsModule } from '@covalent/echarts/bar';
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';
import { SharedModule } from 'app/_shared';
import { JobManagementRoutingModule } from './job-management-routing.module';
import { OverviewJobsComponent } from './pages/overview-jobs/overview-jobs.component';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatCheckboxModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSortModule,
  MatTableModule,
  MatOptionModule,
  MatSelectModule,
  ReactiveFormsModule,
  MatDatepickerModule,
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentBarEchartsModule,
  CovalentTooltipEchartsModule,
  CovalentDataTableModule,
];

@NgModule({
  declarations: [OverviewJobsComponent],
  imports: [SharedModule, ...materialModules, ...covalentModules, JobManagementRoutingModule],
})
export class JobManagementModule {}
