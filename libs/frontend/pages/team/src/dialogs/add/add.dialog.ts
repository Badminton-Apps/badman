import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Team, TeamPlayer, Location } from "@badman/frontend-models";
import { SubEventType, getSeason } from "@badman/utils";
import { TranslatePipe } from "@ngx-translate/core";
import { Apollo, gql } from "apollo-angular";
import { TeamFieldComponent, TeamPlayersComponent } from "../../components";

@Component({
  templateUrl: "./add.dialog.html",
  styleUrls: ["./add.dialog.scss"],
  imports: [
    TranslatePipe,
    TeamFieldComponent,
    TeamPlayersComponent,
    MatDialogModule,
    MatButtonModule,
  ],
})
export class AddDialogComponent {
  public dialogRef = inject<MatDialogRef<AddDialogComponent>>(MatDialogRef<AddDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  public data = inject<{
    team: Partial<Team>;
    teamNumbers: {
      [key in SubEventType]: number[];
    };
    locations: Location[];
  }>(MAT_DIALOG_DATA);
  group?: FormGroup;

  constructor() {
    if (!this.group) {
      this.group = this.fb.group({
        teamNumber: this.fb.control(this.data.team?.teamNumber),
        type: this.fb.control(this.data.team?.type),
        captainId: this.fb.control(this.data.team?.captainId),
        phone: this.fb.control(this.data.team?.phone),
        email: this.fb.control(this.data.team?.email),
        clubId: this.fb.control(this.data.team?.clubId),
        season: this.fb.control(this.data.team?.season ?? getSeason()),
        players: this.fb.array([]),
        prefferedLocationId: this.fb.control(this.data.team?.prefferedLocationId),
        preferredDay: this.fb.control(this.data.team?.preferredDay),
        preferredTime: this.fb.control(this.data.team?.preferredTime),
      });
    }
  }

  async submit() {
    const data = this.group?.getRawValue() as Partial<Team>;

    const players = data.players?.map((player: Partial<TeamPlayer>) => {
      return {
        id: player.id,
        membershipType: player.teamMembership?.membershipType,
      };
    });

    this.apollo
      .mutate({
        mutation: gql`
          mutation CreateTeam($team: TeamNewInput!, $nationalCountsAsMixed: Boolean!) {
            createTeam(data: $team, nationalCountsAsMixed: $nationalCountsAsMixed) {
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
            preferredDay: data.preferredDay,
            preferredTime: data.preferredTime,
            prefferedLocationId: data.prefferedLocationId,
            players,
          },
          nationalCountsAsMixed: true,
        },
        refetchQueries: () => ["Team", "Teams", "ClubTeams"],
      })
      // .pipe(switchMap((res) => {
      // save the players?
      //}))
      .subscribe(() => {
        this.snackBar.open("Saved", undefined, {
          duration: 1000,
          panelClass: "success",
        });
        this.dialogRef.close();
      });
  }
}
