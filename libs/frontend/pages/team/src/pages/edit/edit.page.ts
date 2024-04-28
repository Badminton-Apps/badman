import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConfirmDialogComponent, ConfirmDialogModel } from '@badman/frontend-components';
import { Player, Team, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { SubEventType, TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { pairwise, startWith } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { PLAYERS_CONTROL, TeamFieldComponent, TeamPlayersComponent } from '../../components';

@Component({
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressBarModule,
    TeamFieldComponent,
    TeamPlayersComponent,
  ],
})
export class EditPageComponent implements OnInit {
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private breadcrumbsService = inject(BreadcrumbService);
  private snackBar = inject(MatSnackBar);
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  team!: Team;
  group?: FormGroup;

  teamNumbers?: {
    [key in SubEventType]: number[];
  };

  ngOnInit(): void {
    this.team = this.route.snapshot.data['team'];
    const teamName = `${this.team.name}`;

    this.seoService.update({
      title: teamName,
      description: `Team ${teamName}`,
      type: 'website',
      keywords: ['team', 'badminton'],
    });
    this.breadcrumbsService.set('club/:id', this.route.snapshot.data['club'].name);
    this.breadcrumbsService.set('club/:id/team/:id', teamName);

    if (!this.group) {
      this.group = this.fb.group({
        id: this.fb.control(this.team.id),
        clubId: this.fb.control(this.team.clubId),
        teamNumber: this.fb.control(this.team.teamNumber),
        type: this.fb.control(this.team.type),
        captainId: this.fb.control(this.team.captainId),
        phone: this.fb.control(this.team.phone),
        email: this.fb.control(this.team.email),
        season: this.fb.control(this.team.season),
        preferredDay: this.fb.control(this.team.preferredDay),
        preferredTime: this.fb.control(this.team.preferredTime),
        [PLAYERS_CONTROL]: this.fb.array(this.team.players ?? []),
      });
    }

    this._listenForPlayers();
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

  saveTeam() {
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
            preferredDay: data.preferredDay,
            preferredTime: data.preferredTime,
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
            teamId: this.team.id,
          },
          refetchQueries: ['TeamPlayers'],
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
            teamId: this.team.id,
          },
          refetchQueries: ['TeamPlayers'],
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
              membershipType
              teamId
            }
          }
        `,
        variables: {
          teamId: this.team.id,
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
            id: this.team.id,
          },
          refetchQueries: ['Teams'],
        })
        .subscribe(() => {
          this.snackBar.open('Deleted', undefined, {
            duration: 1000,
            panelClass: 'success',
          });

          // redirect to club
        });
    });
  }
}
