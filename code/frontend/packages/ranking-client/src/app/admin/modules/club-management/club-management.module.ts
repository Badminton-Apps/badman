import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { ClubManagementRoutingModule } from './club-management-routing.module';
import { AddClubComponent } from './pages/add-club/add-club.component';
import { DetailClubComponent } from './pages/detail-club/detail-club.component';
import { EditClubComponent } from './pages/edit-club/edit-club.component';
import { OverviewClubsComponent } from './pages/overview-clubs/overview-clubs.component';
import { ClubFieldsComponent } from './components/club-fields/club-fields.component';

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
  MatIconModule,
];

@NgModule({
  declarations: [
    OverviewClubsComponent,
    AddClubComponent,
    DetailClubComponent,
    EditClubComponent,
    ClubFieldsComponent,
  ],
  imports: [SharedModule, ...materialModules, ClubManagementRoutingModule],
  exports: [ClubFieldsComponent],
})
export class ClubManagementModule {}
