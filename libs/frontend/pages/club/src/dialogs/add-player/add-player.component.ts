import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PlayerSearchComponent } from '@badman/frontend-components';
import { Player } from '@badman/frontend-models';

@Component({
  templateUrl: './add-player.component.html',
  styleUrls: ['./add-player.component.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    // Other modules
    // My Modules
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
