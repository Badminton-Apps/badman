import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Player, RankingSystem } from '@badman/frontend/models';
import { lastValueFrom, map, switchMap } from 'rxjs';
import { UserService } from '@badman/frontend/authentication';
import { SystemService } from '@badman/frontend/ranking';
import { Apollo, gql } from 'apollo-angular';

@Component({
  templateUrl: './merge-account.component.html',
  styleUrls: ['./merge-account.component.scss'],
})
export class MergeAccountComponent implements OnInit {
  toMergePlayers: Player[] = [];
  ignorePlayers!: Player[];

  rankingDate?: Date;

  differentMemberIds = false;

  constructor(
    private systemService: SystemService,
    private apollo: Apollo,
    private userSerive: UserService,
    private _snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<MergeAccountComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { player: Player }
  ) {}

  ngOnInit(): void {
    this.ignorePlayers = [this.data.player];
    this.systemService
      .getPrimarySystemsWhere()
      .pipe(
        switchMap((query) =>
          this.apollo.query<{
            rankingSystems: Partial<RankingSystem>[];
          }>({
            query: gql`
              query GetSystems($where: JSONObject) {
                rankingSystems(where: $where) {
                  id
                  name
                  amountOfLevels
                }
              }
            `,
            variables: {
              where: query,
            },
          })
        ),
        map((x) => x.data.rankingSystems[0])
      )
      .subscribe((system) => {
        this.rankingDate = system?.caluclationIntervalLastUpdate;
      });
  }

  addPlayer(player: Player) {
    this.toMergePlayers.push(player);
    this.ignorePlayers = this.ignorePlayers.concat(player);
  }

  async mergeAccounts() {
    try {
      if (!this.data.player.id) {
        throw new Error('Player has no id');
      }

      await lastValueFrom(
        this.userSerive.mergeAccoutns(
          this.data.player.id,
          this.toMergePlayers.map((x) => {
            if (!x.id) {
              throw new Error('Player has no id');
            }
            return x.id;
          }),
          this.differentMemberIds
        )
      );

      this._snackBar.open('Merged', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.dialogRef.close('success');
    } catch (error) {
      this._snackBar.open((error as { message: string })?.message, undefined, {
        duration: 1000,
        panelClass: 'error',
      });
    }
  }
}
