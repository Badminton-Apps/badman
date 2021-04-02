import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from 'app/_shared';
import { EditPermissionsComponent } from './components/edit-permissions/edit-permissions.component';
import { EditRankingComponent } from './components/edit-ranking/edit-ranking.component';
import { EditPlayerComponent } from './pages/edit-player/edit-player.component';
import { PlayerManagementRoutingModule } from './player-management-routing.module';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatDialogModule,
  MatInputModule,
  ReactiveFormsModule,
];

@NgModule({
  declarations: [
    EditPlayerComponent,
    EditPermissionsComponent,
    EditRankingComponent,
  ],
  imports: [SharedModule, ...materialModules, PlayerManagementRoutingModule],
})
export class PlayerManagementModule {}
