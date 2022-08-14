import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { v4 } from 'uuid';
import { gql } from 'apollo-angular';
import { ConfirmationDialogComponent } from '@badman/frontend/shared';
import {
  Game,
  Player,
  PlayerGame,
  RankingPoint,
  RankingSystem,
} from '@badman/frontend/models';
import { DocumentNode } from 'graphql';

@Component({
  templateUrl: './add-game.component.html',
  styleUrls: ['./add-game.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AddGameComponent implements OnInit {
  formGroup!: FormGroup;

  p1t1!: FormControl;
  p1t2!: FormControl;

  p2t1!: FormControl;
  p2t2!: FormControl;

  p1t1Level!: FormControl;
  p1t2Level!: FormControl;

  p2t1Level!: FormControl;
  p2t2Level!: FormControl;

  fragment: DocumentNode;

  constructor(
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      playerId: string;
      type: 'single' | 'double' | 'mix';
      system: RankingSystem;
    }
  ) {
    this.fragment = gql`
      fragment AddGameInfo on Player {
        lastRanking {
          id
          ${this.data.type}
        }
      }
    `;
  }

  ngOnInit(): void {
    this.p1t1 = new FormControl(this.data.playerId);
    this.p1t2 = new FormControl(null);
    this.p2t1 = new FormControl(null);
    this.p2t2 = new FormControl(null);

    this.p1t1Level = new FormControl(null, [Validators.required]);
    this.p1t2Level = new FormControl(null, [Validators.required]);
    this.p2t1Level = new FormControl(null);
    this.p2t2Level = new FormControl(null);

    this.p1t1.valueChanges.subscribe((r: Partial<Player>) => {
      if (r.lastRanking?.[this.data.type] != null) {
        this.p1t1Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p1t2.valueChanges.subscribe((r: Partial<Player>) => {
      if (r.lastRanking?.[this.data.type] != null) {
        this.p1t2Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p2t1.valueChanges.subscribe((r: Partial<Player>) => {
      if (r.lastRanking?.[this.data.type] != null) {
        this.p2t1Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p2t2.valueChanges.subscribe((r: Partial<Player>) => {
      if (r.lastRanking?.[this.data.type] != null) {
        this.p2t2Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.formGroup = new FormGroup({
      won: new FormControl(true, [Validators.required]),
      p1t1: this.p1t1,
      p1t2: this.p1t2,
      p2t1: this.p2t1,
      p2t2: this.p2t2,
      p1t1Level: this.p1t1Level,
      p1t2Level: this.p1t2Level,
      p2t1Level: this.p2t1Level,
      p2t2Level: this.p2t2Level,
    });
  }

  onConfirm(): void {
    if (!this.formGroup.valid) {
      return;
    }
    // Just easy access
    const t1won = this.formGroup.value.won;

    // Prepare lists
    const players: PlayerGame[] = [];
    const rankingPoints: RankingPoint[] = [];

    const team1 = this.p1t1Level.value + (this.p2t1Level.value ?? 0);
    const team2 = this.p1t2Level.value + (this.p2t2Level.value ?? 0);

    const differenceInLevel = t1won
      ? (team1 - team2) / (this.data.type == 'single' ? 1 : 2)
      : (team2 - team1) / (this.data.type == 'single' ? 1 : 2);

    const team1Points = this.p2t1Level.value
      ? (this._getWinningPoints(this.p1t1Level.value) +
          this._getWinningPoints(this.p2t1Level.value)) /
        2
      : this._getWinningPoints(this.p1t1Level.value);

    const team2Points = this.p2t2Level.value
      ? (this._getWinningPoints(this.p1t2Level.value) +
          this._getWinningPoints(this.p2t2Level.value)) /
        2
      : this._getWinningPoints(this.p1t2Level.value);

    players.push({
      ...(this.p1t1.value as Partial<Player>),
      rankingPlace: { [this.data.type]: this.p1t1Level.value },
      team: 1,
      player: 1,
    } as PlayerGame);
    players.push({
      ...(this.p1t2.value as Partial<Player>),
      rankingPlace: { [this.data.type]: this.p1t2Level.value },
      team: 2,
      player: 1,
    } as PlayerGame);

    rankingPoints.push({
      playerId: this.p1t1?.value?.id,
      points: t1won ? team2Points : 0,
      differenceInLevel: t1won ? -differenceInLevel : differenceInLevel,
    });
    rankingPoints.push({
      playerId: this.p1t2?.value?.id,
      points: t1won ? 0 : team1Points,
      differenceInLevel: t1won ? differenceInLevel : -differenceInLevel,
    });

    if (this.p2t1.value != null) {
      players.push({
        ...(this.p2t1.value as Partial<Player>),
        rankingPlace: { [this.data.type]: this.p2t1Level.value },
        team: 1,
        player: 2,
      } as PlayerGame);
      rankingPoints.push({
        playerId: this.p2t1.value.id,
        points: t1won ? team2Points : 0,
        differenceInLevel: t1won ? -differenceInLevel : differenceInLevel,
      });
    }

    if (this.p2t2.value != null) {
      players.push({
        ...(this.p2t2.value as Partial<Player>),
        rankingPlace: { [this.data.type]: this.p2t2Level.value },
        team: 2,
        player: 2,
      } as PlayerGame);
      rankingPoints.push({
        playerId: this.p2t2.value.id,
        points: t1won ? 0 : team1Points,
        differenceInLevel: t1won ? differenceInLevel : -differenceInLevel,
      });
    }

    const game = new Game({
      id: v4(),
      winner: t1won ? 1 : 0,
      rankingPoints,
      players,
      playedAt: new Date(),
    });

    this.dialogRef.close(game);
  }

  onDismiss(): void {
    this.dialogRef.close();
  }

  private _getWinningPoints(level: number): number {
    const index =
      this.data?.system?.pointsWhenWinningAgainst?.length ?? 0 - level;
    return this.data?.system?.pointsWhenWinningAgainst?.[index] ?? 0;
  }
}
