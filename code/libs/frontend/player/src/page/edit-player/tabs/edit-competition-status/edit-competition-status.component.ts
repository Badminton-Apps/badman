import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime, map } from 'rxjs';

@Component({
  selector: 'badman-edit-competition-status',
  templateUrl: './edit-competition-status.component.html',
  styleUrls: ['./edit-competition-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCompetitionStatusComponent implements OnInit {
  playerForm!: FormGroup;

  @Input()
  player!: Player;

  constructor(private apollo: Apollo, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    const compPlayer = new FormControl(this.player.competitionPlayer);

    this.playerForm = new FormGroup({
      compPlayer: compPlayer,
    });

    compPlayer.valueChanges.pipe(debounceTime(600)).subscribe(() => {
      if (compPlayer.valid && compPlayer.value) {
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
                id: this.player.id,
                competitionPlayer: compPlayer.value,
              },
            },
          })
          .pipe(
            map((r) => new Player(r.data?.updatePlayer)),
            debounceTime(600)
          )
          .subscribe(() => {
            this._snackBar.open('Saved', undefined, {
              duration: 1000,
              panelClass: 'success',
            });
          });
      }
    });
  }
}
