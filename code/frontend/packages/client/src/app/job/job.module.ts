import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CovalentDataTableModule } from '@covalent/core/data-table';
import { CovalentBarEchartsModule } from '@covalent/echarts/bar';
import { CovalentBaseEchartsModule } from '@covalent/echarts/base';
import { CovalentTooltipEchartsModule } from '@covalent/echarts/tooltip';
import { SharedModule } from 'app/_shared';
import { JobRoutingModule } from './job-routing.module';
import { OverviewJobsComponent } from './pages/overview-jobs/overview-jobs.component';

const materialModules = [
  MatButtonModule,
  MatCheckboxModule,
  MatDialogModule,
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
  MatDatepickerModule,
  MatTooltipModule
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentBarEchartsModule,
  CovalentTooltipEchartsModule,
  CovalentDataTableModule,
];

@NgModule({
  declarations: [OverviewJobsComponent],
  imports: [SharedModule, ...materialModules, ...covalentModules, JobRoutingModule],
})
export class JobModule {}
