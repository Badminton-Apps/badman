import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HasClaimModule } from '@badman/frontend-authentication';
import { PlayerSearchModule } from '@badman/frontend-components-player-search';
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
    FlexLayoutModule,
    MatListModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PlayerSearchModule,
    TranslateModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    HasClaimModule,
    MatDialogModule,
    MatProgressBarModule,
  ],
})
export class TeamModule {}
