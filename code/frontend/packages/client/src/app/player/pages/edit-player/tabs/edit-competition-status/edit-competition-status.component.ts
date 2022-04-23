import { Component, OnInit, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Player, PlayerService } from 'app/_shared';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-edit-competition-status',
  templateUrl: './edit-competition-status.component.html',
  styleUrls: ['./edit-competition-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCompetitionStatusComponent implements OnInit {
  playerForm!: FormGroup;

  @Input()
  player!: Player;

  constructor(private playerService: PlayerService, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    const compPlayer = new FormControl(this.player.competitionPlayer);

    this.playerForm = new FormGroup({
      compPlayer: compPlayer,
    });

    compPlayer.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
      if (compPlayer.valid) {
        this.playerService
          .updatePlayer({
            id: this.player.id,
            competitionPlayer: compPlayer.value
          })
          .pipe(debounceTime(600))
          .subscribe((_) => {
            this._snackBar.open('Saved', undefined, {
              duration: 1000,
              panelClass: 'success',
            });
          });
      }
    });
  }
}
