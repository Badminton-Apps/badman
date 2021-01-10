import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatMomentDateModule } from '@angular/material-moment-adapter';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ClubManagementRoutingModule } from './club-management-routing.module';
import { OverviewClubsComponent } from './pages/overview-clubs/overview-clubs.component';
import { AddClubComponent } from './pages/add-club/add-club.component';
import { DetailClubComponent } from './pages/detail-club/detail-club.component';
import { EditClubComponent } from './pages/edit-club/edit-club.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
  MatMomentDateModule,
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
    OverviewClubsComponent,
    AddClubComponent,
    DetailClubComponent,
    EditClubComponent,
  ],
  imports: [SharedModule, ...materialModules, ClubManagementRoutingModule],
})
export class ClubManagementModule {}
