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
import { SharedModule } from '../../../_shared';
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
  imports: [SharedModule, ...materialModules, RankingManagementRoutingModule],
})
export class RankingManagementModule {}
