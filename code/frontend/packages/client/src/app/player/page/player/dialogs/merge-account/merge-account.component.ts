import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Player, SystemService, UserService } from 'app/_shared';
import { lastValueFrom } from 'rxjs';

@Component({
  templateUrl: './merge-account.component.html',
  styleUrls: ['./merge-account.component.scss'],
})
export class MergeAccountComponent implements OnInit {
  toMergePlayers: Player[] = [];
  ignorePlayers!: Player[];

  rankingDate?: Date;

  differentMemberIds: boolean = false;

  constructor(
    private systemService: SystemService,
    private userSerive: UserService,
    private _snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<MergeAccountComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { player: Player }
  ) {}

  ngOnInit(): void {
    this.ignorePlayers = [this.data.player];
    this.systemService.getPrimarySystem().subscribe((system) => {
      this.rankingDate = system?.caluclationIntervalLastUpdate;
    });
  }

  addPlayer(player: Player) {
    this.toMergePlayers.push(player);
    this.ignorePlayers = this.ignorePlayers.concat(player);
  }

  async mergeAccounts() {
    try {
      await lastValueFrom(
        this.userSerive.mergeAccoutns(
          this.data.player.id!,
          this.toMergePlayers.map((x) => x.id!),
          this.differentMemberIds
        )
      );

     

      this._snackBar.open('Merged', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.dialogRef.close();
    } catch (error: any) {
      this._snackBar.open(error.message, undefined, {
        duration: 1000,
        panelClass: 'error',
      });
    }
  }
}
