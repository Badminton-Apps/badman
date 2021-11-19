import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { ClubManagementRoutingModule } from './club-management-routing.module';
import { ClubFieldsComponent, RoleFieldsComponent } from './components';
import { AddPlayerComponent } from './dialogs/add-player/add-player.component';
import {
  AddClubComponent,
  AddRoleComponent,
  ClubEditRoleComponent,
  ClubEditLocationComponent,
  EditClubComponent,
  EditRoleComponent,
} from './pages';
import { ClubEditTeamComponent } from './pages/edit-club/components/club-edit-team/club-edit-team.component';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSnackBarModule,
  MatSortModule,
  MatCheckboxModule,
  MatTableModule,
  ReactiveFormsModule,
  MatIconModule,
  MatOptionModule,
  MatFormFieldModule,
  MatSelectModule
];

@NgModule({
  declarations: [
    AddClubComponent,
    EditClubComponent,
    EditRoleComponent,
    ClubFieldsComponent,
    RoleFieldsComponent,
    AddPlayerComponent,
    AddRoleComponent,
    ClubEditRoleComponent,
    ClubEditLocationComponent,
    ClubEditTeamComponent,
  ],
  imports: [SharedModule, ...materialModules, ClubManagementRoutingModule],
  exports: [ClubFieldsComponent],
})
export class ClubManagementModule {}
