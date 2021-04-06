import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from 'app/_shared';
import { EditPermissionsComponent } from './components/edit-permissions/edit-permissions.component';
import { EditRankingComponent } from './components/edit-ranking/edit-ranking.component';
import { EditPlayerComponent, LinkAccountComponent } from './pages';
import { PlayerManagementRoutingModule } from './player-management-routing.module';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatDialogModule,
  MatInputModule,
  ReactiveFormsModule,
  MatProgressBarModule,
  MatCardModule,
  MatTableModule,
  MatCheckboxModule,
  MatSortModule
];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPermissionsComponent,
    EditRankingComponent,
    LinkAccountComponent
  ],
  imports: [SharedModule, ...materialModules, PlayerManagementRoutingModule],
})
export class PlayerManagementModule {}
