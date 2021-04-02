import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
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
import { RankingSystemFieldsComponent } from './components/ranking-system-fields/ranking-system-fields.component';
import {
  AddRankingSystemComponent,
  DetailRankingSystemComponent,
  EditRankingSystemComponent,
  GraphComponent,
  GraphsComponent,
  OverviewRankingSystemsComponent,
} from './pages';
import { RankingManagementRoutingModule } from './ranking-management-routing.module';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatCheckboxModule,
  MatDatepickerModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatMomentDateModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSortModule,
  MatTableModule,
  MatOptionModule,
  MatSelectModule,
  ReactiveFormsModule,
];

const covalentModules = [
  CovalentBaseEchartsModule,
  CovalentBarEchartsModule,
  CovalentTooltipEchartsModule,
  CovalentDataTableModule,
];

@NgModule({
  declarations: [
    OverviewRankingSystemsComponent,
    RankingSystemFieldsComponent,
    EditRankingSystemComponent,
    AddRankingSystemComponent,
    DetailRankingSystemComponent,
    GraphsComponent,
    GraphComponent,
  ],
  imports: [
    SharedModule,
    ...materialModules,
    ...covalentModules,
    RankingManagementRoutingModule,
  ],
})
export class RankingManagementModule {}
