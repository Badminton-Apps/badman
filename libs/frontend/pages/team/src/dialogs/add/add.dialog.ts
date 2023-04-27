import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TeamFieldComponent, TeamPlayersComponent } from '../../components';
import { Player, Team, TeamPlayer } from '@badman/frontend-models';
import { SubEventType, TeamMembershipType, getCurrentSeason } from '@badman/utils';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { switchMap } from 'rxjs';

@Component({
  templateUrl: './add.dialog.html',
  styleUrls: ['./add.dialog.scss'],
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
  ],
})
export class AddDialogComponent {
  group?: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AddDialogComponent>,
    private snackBar: MatSnackBar,
    private apollo: Apollo,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      team: Partial<Team>;
      teamNumbers: {
        [key in SubEventType]: number[];
      };
    }
  ) {
    if (!this.group) {
      this.group = this.fb.group({
        teamNumber: this.fb.control(this.data.team?.teamNumber),
        type: this.fb.control(this.data.team?.type),
        captainId: this.fb.control(this.data.team?.captainId),
        phone: this.fb.control(this.data.team?.phone),
        email: this.fb.control(this.data.team?.email),
        clubId: this.fb.control(this.data.team?.clubId),
        season: this.fb.control(this.data.team?.season ?? getCurrentSeason()),
        players: this.fb.array([]),
      });
    }
  }

  async submit() {
    const data = this.group?.value;

    this.apollo
      .mutate<{ createTeam: Partial<Team> }>({
        mutation: gql`
          mutation CreateTeam($team: TeamNewInput!) {
            createTeam(data: $team) {
              id
            }
          }
        `,
        variables: {
          team: {
            id: data.id,
            teamNumber: data.teamNumber,
            clubId: data.clubId,
            type: data.type,
            captainId: data.captainId,
            season: data.season,
            phone: data.phone,
            email: data.email,
          },
        },
        refetchQueries: () => ['Team', 'Teams'],
      })
      // .pipe(switchMap((res) => {
      // save the players?
      //}))
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
        this.dialogRef.close();
      });
  }
}
