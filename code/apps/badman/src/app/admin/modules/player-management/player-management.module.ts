import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { LinkAccountComponent } from './pages';
import { PlayerManagementRoutingModule } from './player-management-routing.module';

const materialModules = [
  MatButtonModule,
  MatDialogModule,
  MatInputModule,
  MatProgressBarModule,
  MatCardModule,
  MatTableModule,
  MatCheckboxModule,
  MatSortModule,
];

@NgModule({
  declarations: [
    LinkAccountComponent,
  ],
  imports: [SharedModule, ...materialModules, PlayerManagementRoutingModule],
})
export class PlayerManagementModule {}
