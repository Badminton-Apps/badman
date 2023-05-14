import { CommonModule } from '@angular/common';
import { Component, Inject, PLATFORM_ID, TransferState } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Player, Team, TeamPlayer } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { SubEventType, TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, take } from 'rxjs';
import { TeamFieldComponent, TeamPlayersComponent } from '../../components';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
} from '@badman/frontend-components';

@Component({
  templateUrl: './edit.dialog.html',
  styleUrls: ['./edit.dialog.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    // My Modules
    TeamFieldComponent,
    TeamPlayersComponent,

    // Material
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
})
export class EditDialogComponent {
  group?: FormGroup;

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private apollo: Apollo,
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditDialogComponent>,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      team: Team;
      teamNumbers: {
        [key in SubEventType]: number[];
      };
    }
  ) {
    const group = this.fb.group({
      id: this.fb.control(this.data.team.id),
      clubId: this.fb.control(this.data.team.clubId),
      teamNumber: this.fb.control(this.data.team.teamNumber),
      type: this.fb.control(this.data.team.type),
      captainId: this.fb.control(this.data.team.captainId),
      phone: this.fb.control(this.data.team.phone),
      email: this.fb.control(this.data.team.email),
      season: this.fb.control(this.data.team.season),
      players: this.fb.array(this.data.team.players ?? []),
    });

    // Check if the data has players otherwise load them
    if ((group.value.players?.length ?? 0) > 0) {
      this.group = group;
    } else {
      lastValueFrom(this._loadPlayers()).then((players) => {
        group?.setControl('players', this.fb.array(players ?? []));
        this.group = group;
      });
    }
  }

  private _loadPlayers() {
    return this.apollo
      .watchQuery<{ team: Partial<Team> }>({
        query: gql`
          query TeamPlayers($teamId: ID!) {
            team(id: $teamId) {
              id
              players {
                id
                fullName
                membershipType
                teamId
              }
            }
          }
        `,
        variables: {
          teamId: this.data.team.id,
        },
      })
      .valueChanges.pipe(
        transferState(`teamPlayers-${this.data.team.id}`, this.stateTransfer, this.platformId),
        map((result) =>
          result?.data.team.players?.map((t) => new TeamPlayer(t))
        ),
        map(
          (players) =>
            players?.sort((a, b) => a.fullName.localeCompare(b.fullName)) ??
            undefined
        ),
        take(1)
      );
  }

  teamUpdated() {
    const data = this.group?.value;

    return this.apollo
      .mutate<{ createTeam: Partial<Team> }>({
        mutation: gql`
          mutation UpdateTeam($team: TeamUpdateInput!) {
            updateTeam(data: $team) {
              id
            }
          }
        `,
        variables: {
          team: {
            id: data.id,
            teamNumber: data.teamNumber,
            type: data.type,
            captainId: data.captainId,
            phone: data.phone,
            email: data.email,
          },
        },
        refetchQueries: () => ['Team', 'Teams'],
      })
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  async playerAdded(player: Player) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation addPlayerFromTeamMutation($playerId: ID!, $teamId: ID!) {
              addPlayerFromTeam(playerId: $playerId, teamId: $teamId) {
                id
              }
            }
          `,
          variables: {
            playerId: player.id,
            teamId: this.data.team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  async playerRemoved(player: Player) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromTeamMutation(
              $playerId: ID!
              $teamId: ID!
            ) {
              removePlayerFromTeam(playerId: $playerId, teamId: $teamId) {
                id
              }
            }
          `,
          variables: {
            playerId: player.id,
            teamId: this.data.team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  playerMembershipTypeChanged(args: {
    player: TeamPlayer;
    type: TeamMembershipType;
  }) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateTeamPlayerMembership(
            $teamId: ID!
            $playerId: ID!
            $membershipType: String!
          ) {
            updateTeamPlayerMembership(
              teamId: $teamId
              playerId: $playerId
              membershipType: $membershipType
            ) {
              id
              membershipType
              teamId
            }
          }
        `,
        variables: {
          teamId: this.data.team.id,
          playerId: args.player.id,
          membershipType: args.type,
        },
        refetchQueries: ['TeamPlayers'],
      })
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  removeTeam() {
    const dialogData = new ConfirmDialogModel(
      'all.club.delete.team.title',
      'all.club.delete.team.description'
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '400px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (!dialogResult) {
        return;
      }

      this.apollo
        .mutate({
          mutation: gql`
            mutation DeleteTeam($id: ID!) {
              deleteTeam(id: $id)
            }
          `,
          variables: {
            id: this.data.team.id,
          },
          refetchQueries: ['Teams'],
        })
        .subscribe(() => {
          this.snackBar.open('Deleted', undefined, {
            duration: 1000,
            panelClass: 'success',
          });
          this.dialogRef.close();
        });
    });
  }
}
