import { Component, OnInit, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Player } from 'app/_shared';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-edit-competition-status',
  templateUrl: './edit-competition-status.component.html',
  styleUrls: ['./edit-competition-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCompetitionStatusComponent implements OnInit {
  playerForm!: FormGroup;

  @Output() onPlayerChanged = new EventEmitter<Partial<Player>>();

  @Input()
  player!: Player;

  ngOnInit(): void {
    const compPlayer = new FormControl(this.player.competitionPlayer);

    this.playerForm = new FormGroup({
      compPlayer: compPlayer,
    });

    this.playerForm.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
      if (this.playerForm.valid) {
        this.onPlayerChanged.next({
          competitionPlayer: this.playerForm.value.compPlayer,
        });
      }
    });
  }
}
