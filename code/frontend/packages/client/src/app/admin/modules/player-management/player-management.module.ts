import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { EditPermissionsComponent, EditPlayerFieldsComponent, EditRankingComponent } from './components';
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
  MatSortModule,
];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPlayerFieldsComponent,
    EditPermissionsComponent,
    EditRankingComponent,
    LinkAccountComponent,
  ],
  imports: [SharedModule, ...materialModules, PlayerManagementRoutingModule],
})
export class PlayerManagementModule {}
