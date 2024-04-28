import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { Player } from '@badman/frontend-models';
import { PlayerSearchComponent } from '../player-search';

@Component({
  templateUrl: './add-player.component.html',
  styleUrls: ['./add-player.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, MatDialogModule, MatButtonModule, PlayerSearchComponent],
})
export class AddPlayerComponent {
  public dialogRef = inject<MatDialogRef<AddPlayerComponent>>(MatDialogRef<AddPlayerComponent>);
  public data = inject<Partial<Player>>(MAT_DIALOG_DATA);

  selectPlayer(player: Player) {
    this.dialogRef.close(player);
  }
}
