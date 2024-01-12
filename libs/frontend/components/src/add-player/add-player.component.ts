import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { Player } from '@badman/frontend-models';
import { PlayerSearchComponent } from '../player-search';

@Component({
  templateUrl: './add-player.component.html',
  styleUrls: ['./add-player.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    PlayerSearchComponent
],
})
export class AddPlayerComponent {
  constructor(
    public dialogRef: MatDialogRef<AddPlayerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Player>
  ) {}

  selectPlayer(player: Player) {
    this.dialogRef.close(player);
  }
}
