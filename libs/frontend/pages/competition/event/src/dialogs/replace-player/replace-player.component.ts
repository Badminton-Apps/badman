import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EncounterCompetition, GamePlayer } from '@badman/frontend-models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'badman-replace-player',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule
],
  templateUrl: './replace-player.component.html',
  styleUrls: ['./replace-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplacePlayerComponent implements OnInit {
  players?: GamePlayer[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      player: GamePlayer;
      game: number;
      encounter: EncounterCompetition;
    }
  ) {}

  ngOnInit(): void {
    // get all players from the encounter's games
    for (const game of this.data.encounter?.games ?? []) {
      if (game.players !== undefined) {
        for (const player of game.players) {
          if (player !== undefined && player.id !== this.data.player.id) {
            if (this.players?.findIndex((p) => p.id === player.id) === -1) {
              this.players?.push(player);
            }
          }
        }
      }
    }
  }
}
