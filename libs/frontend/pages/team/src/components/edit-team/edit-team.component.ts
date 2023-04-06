import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClaimService } from '@badman/frontend-auth';
import { Player, Team, TeamPlayer } from '@badman/frontend-models';
import { TeamMembershipType } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { TeamFieldComponent } from '../fields';
import { TeamPlayersComponent } from '../players';

@Component({
  selector: 'badman-edit-team',
  standalone: true,
  imports: [
    CommonModule,
    TeamFieldComponent,
    TeamPlayersComponent,
    MatSnackBarModule,
  ],
  templateUrl: './edit-team.component.html',
  styleUrls: ['./edit-team.component.scss'],
})
export class EditTeamComponent {
  @Input()
  teamId!: string;

  team$: Observable<Team>;

  constructor(
    private apollo: Apollo,
    private claimsService: ClaimService,
    private snackBar: MatSnackBar
  ) {
    this.team$ = this.claimsService
      .hasAnyClaims$(['details-any:team', this.teamId + '_details:team'])
      .pipe(
        switchMap(
          (hasClaims) =>
            this.apollo.watchQuery<{ team: Partial<Team> }>({
              query: gql`
                query Team($id: ID!, $personal: Boolean!) {
                  team(id: $id) {
                    id
                    name
                    teamNumber
                    type
                    clubId
                    phone @include(if: $personal)
                    email @include(if: $personal)
                    captain {
                      id
                    }
                  }
                }
              `,
              variables: {
                id: this.teamId,
                personal: hasClaims,
              },
            }).valueChanges
        ),
        map((result) => {
          if (!result.data.team) {
            throw new Error('No team');
          }
          return new Team(result.data.team);
        })
      );
  }

  teamUpdated(team: Team) {
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
            id: team.id,
            teamNumber: team.teamNumber,
            type: team.type,
            captainId: team.captainId,
            phone: team.phone,
            email: team.email,
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

  async playerAdded(player: Player, team: Team) {
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
            teamId: team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  async playerRemoved(player: Player, team: Team) {
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
            teamId: team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  playerMembershipTypeChanged(
    args: { player: TeamPlayer; type: TeamMembershipType },
    team: Team
  ) {
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
          teamId: team.id,
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
}
