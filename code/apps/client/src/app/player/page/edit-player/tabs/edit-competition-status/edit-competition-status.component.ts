import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';
import { Player, PlayerService } from '../../../../../_shared';

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

  constructor(
    private playerService: PlayerService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const compPlayer = new FormControl(this.player.competitionPlayer);

    this.playerForm = new FormGroup({
      compPlayer: compPlayer,
    });

    compPlayer.valueChanges.pipe(debounceTime(600)).subscribe(() => {
      if (compPlayer.valid && compPlayer.value) {
        this.playerService
          .updatePlayer({
            id: this.player.id,
            competitionPlayer: compPlayer.value,
          })
          .pipe(debounceTime(600))
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
