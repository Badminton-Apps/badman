import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ApolloModule } from 'apollo-angular';
import { RankingSystemFieldsComponent } from './components';
import {
  AddRankingSystemComponent,
  DetailRankingSystemComponent,
  EditRankingSystemComponent,
  GraphComponent,
  GraphsComponent,
  OverviewRankingSystemsComponent,
} from './pages';
import { RankingRoutingModule } from './ranking-routing.module';
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
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
  imports: [
    ...materialModules,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ApolloModule,
    CommonModule,
    RankingRoutingModule,
  ],
  providers: [],
})
export class RankingModule {}
