import { ChangeDetectionStrategy, Component, OnInit, input, inject } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HasClaimComponent } from "@badman/frontend-components";
import { Player } from "@badman/frontend-models";
import { TranslatePipe } from "@ngx-translate/core";
import { Apollo, gql } from "apollo-angular";
import { throttleTime, map } from "rxjs";

@Component({
  selector: "badman-edit-competition-status",
  templateUrl: "./edit-competition-status.component.html",
  styleUrls: ["./edit-competition-status.component.scss"],
  imports: [HasClaimComponent, MatSlideToggleModule, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCompetitionStatusComponent implements OnInit {
  private apollo = inject(Apollo);
  private _snackBar = inject(MatSnackBar);
  playerForm!: FormGroup;

  player = input.required<Player>();

  ngOnInit(): void {
    const compPlayer = new FormControl(this.player().competitionPlayer);

    this.playerForm = new FormGroup({
      compPlayer: compPlayer,
    });

    compPlayer.valueChanges.pipe(throttleTime(600)).subscribe(() => {
      if (compPlayer.valid) {
        this.apollo
          .mutate<{ updatePlayer: Player }>({
            mutation: gql`
              mutation UpdatePlayer($data: PlayerUpdateInput!) {
                updatePlayer(data: $data) {
                  id
                  firstName
                  lastName
                  competitionPlayer
                }
              }
            `,
            variables: {
              data: {
                id: this.player().id,
                competitionPlayer: compPlayer.value,
              },
            },
          })
          .pipe(
            map((r) => new Player(r.data?.updatePlayer)),
            throttleTime(600)
          )
          .subscribe(() => {
            this._snackBar.open("Saved", undefined, {
              duration: 1000,
              panelClass: "success",
            });
          });
      }
    });
  }
}
