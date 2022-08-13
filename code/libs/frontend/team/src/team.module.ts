import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerSearchModule } from '@badman/frontend/components/player-search';
import { HasClaimModule } from '@badman/frontend/components/has-claim';
import { TranslateModule } from '@ngx-translate/core';
import {
  TeamDialogComponent,
  TeamFieldsComponent,
  TeamPlayersComponent,
} from './dialogs';

@NgModule({
  declarations: [
    TeamDialogComponent,
    TeamFieldsComponent,
    TeamPlayersComponent,
  ],
  imports: [
    CommonModule,
    MatListModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    PlayerSearchModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatOptionModule,
    HasClaimModule,
    MatDialogModule,
    MatProgressBarModule,
  ],
})
export class TeamModule {}
