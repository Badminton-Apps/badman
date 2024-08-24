import { CommonModule } from '@angular/common';
import { Component, PLATFORM_ID, TransferState, inject } from '@angular/core';
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
import { ConfirmDialogComponent, ConfirmDialogModel } from '@badman/frontend-components';
import { Player, Team, TeamPlayer, Location } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { SubEventType, TeamMembershipType, sortPlayers } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, pairwise, startWith, take } from 'rxjs';
import { PLAYERS_CONTROL, TeamFieldComponent, TeamPlayersComponent } from '../../components';

const PLAYERS_QUERY = gql`
  query TeamPlayers($teamId: ID!) {
    team(id: $teamId) {
      id
      players {
        id
        fullName
        teamMembership {
          id
          membershipType
        }
      }
    }
  }
`;

@Component({
  templateUrl: './edit.dialog.html',
  styleUrls: ['./edit.dialog.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TeamFieldComponent,
    TeamPlayersComponent,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
})
export class EditDialogComponent {
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  public dialogRef = inject<MatDialogRef<EditDialogComponent>>(MatDialogRef<EditDialogComponent>);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  public data = inject<{
    team: Team;
    teamNumbers: {
      [key in SubEventType]: number[];
    };
    locations: Location[];
  }>(MAT_DIALOG_DATA);
  group?: FormGroup;
  saveing = false;

  constructor() {
    if (!this.data.locations) {
      this.getLocations().subscribe((locations) => {
        this.data.locations = locations;
      });
    }

    const group = this.fb.group({
      id: this.fb.control(this.data.team.id),
      clubId: this.fb.control(this.data.team.clubId),
      teamNumber: this.fb.control(this.data.team.teamNumber),
      type: this.fb.control(this.data.team.type),
      captainId: this.fb.control(this.data.team.captainId),
      phone: this.fb.control(this.data.team.phone),
      email: this.fb.control(this.data.team.email),
      season: this.fb.control(this.data.team.season),
      preferredDay: this.fb.control(this.data.team.preferredDay),
      preferredTime: this.fb.control(this.data.team.preferredTime),
      prefferedLocationId: this.fb.control(this.data.team.prefferedLocationId),
      [PLAYERS_CONTROL]: this.fb.array(this.data.team.players ?? []),
    });

    // Check if the data has players otherwise load them
    if ((group.value?.[PLAYERS_CONTROL]?.length ?? 0) > 0) {
      this.group = group;
      this._listenForPlayers();
    } else {
      lastValueFrom(this._loadPlayers()).then((players) => {
        group?.setControl(PLAYERS_CONTROL, this.fb.array(players ?? []));
        this.group = group;
        this._listenForPlayers();
      });
    }
  }

  private _listenForPlayers() {
    this.group
      ?.get(PLAYERS_CONTROL)
      ?.valueChanges.pipe(startWith(this.group.get(PLAYERS_CONTROL)?.value ?? []), pairwise())
      .subscribe(([prev, curr]: [TeamPlayer[], TeamPlayer[]]) => {
        if (!prev || !curr) {
          return;
        }

        // filter out the new players
        const newPlayers = curr.filter((c) => !prev.some((p) => p?.id === c?.id));

        // filter out the removed players
        const removedPlayers = prev.filter((p) => !curr.some((c) => c?.id === p?.id));

        // if there are new players
        for (const player of newPlayers) {
          if (player) {
            this.playerAdded(player);
          }
        }

        // if there are removed players
        for (const player of removedPlayers) {
          if (player) {
            this.playerRemoved(player);
          }
        }
      });
  }

  private _loadPlayers() {
    return this.apollo
      .watchQuery<{ team: Partial<Team> }>({
        query: PLAYERS_QUERY,
        variables: {
          teamId: this.data.team.id,
        },
      })
      .valueChanges.pipe(
        transferState(`teamPlayers-${this.data.team.id}`, this.stateTransfer, this.platformId),
        map((result) => result?.data.team.players?.map((t) => new TeamPlayer(t))),
        map((players) => players?.sort(sortPlayers) ?? undefined),
        take(1),
      );
  }

  saveTeam() {
    const data = this.group?.value;
    this.saveing = true;

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
            preferredDay: data.preferredDay,
            preferredTime: data.preferredTime,
            prefferedLocationId: data.prefferedLocationId,
          },
        },
        refetchQueries: () => [
          'Team',
          'Teams',
          'ClubTeams',
          {
            query: PLAYERS_QUERY,
            variables: {
              teamId: this.data.team.id,
            },
          },
        ],
      })
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
        this.saveing = false;

        this.dialogRef.close();
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
          refetchQueries: [
            {
              query: PLAYERS_QUERY,
              variables: {
                teamId: this.data.team.id,
              },
            },
          ],
        }),
      );
    }
  }

  async playerRemoved(player: Player) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromTeamMutation($playerId: ID!, $teamId: ID!) {
              removePlayerFromTeam(playerId: $playerId, teamId: $teamId) {
                id
              }
            }
          `,
          variables: {
            playerId: player.id,
            teamId: this.data.team.id,
          },
          refetchQueries: [
            {
              query: PLAYERS_QUERY,
              variables: {
                teamId: this.data.team.id,
              },
            },
          ],
        }),
      );
    }
  }

  playerMembershipTypeChanged(args: { player: TeamPlayer; type: TeamMembershipType }) {
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
              teamMembership {
                membershipType
                teamId
              }
            }
          }
        `,
        variables: {
          teamId: this.data.team.id,
          playerId: args.player.id,
          membershipType: args.type,
        },
        refetchQueries: [
          {
            query: PLAYERS_QUERY,
            variables: {
              teamId: this.data.team.id,
            },
          },
        ],
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
      'all.club.delete.team.description',
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
          refetchQueries: [
            {
              query: PLAYERS_QUERY,
              variables: {
                teamId: this.data.team.id,
              },
            },
          ],
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

  getLocations() {
    return this.apollo
      .query<{ locations: Location[] }>({
        fetchPolicy: 'network-only',
        query: gql`
          query Locations($where: JSONObject, $availabilitiesWhere: JSONObject) {
            locations(where: $where) {
              id
              name
              address
              street
              streetNumber
              postalcode
              city
              state
              phone
              fax
              availabilities(where: $availabilitiesWhere) {
                id
                season
                days {
                  day
                  startTime
                  endTime
                  courts
                }
                exceptions {
                  start
                  end
                  courts
                }
              }
            }
          }
        `,
        variables: {
          where: {
            clubId: this.data.team.clubId,
          },
          availabilitiesWhere: {
            season: this.data.team.season,
          },
        },
      })
      .pipe(map((result) => result.data?.locations?.map((location) => new Location(location))));
  }
}
