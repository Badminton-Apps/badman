import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SelectPlayerComponent } from '@badman/frontend-components';
import {
  Game,
  Player,
  GamePlayer,
  RankingPoint,
  RankingSystem,
} from '@badman/frontend-models';
import { GameType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { gql } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'badman-add-game',
  templateUrl: './add-game.component.html',
  styleUrls: ['./add-game.component.scss'],
  //   encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatInputModule,
    MatButtonModule,
    SelectPlayerComponent,
  ],
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
    private dialogRef: MatDialogRef<AddGameComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      playerId: string;
      type: 'single' | 'double' | 'mix';
      system: RankingSystem;
    },
  ) {
    this.fragment = gql`
      fragment AddGameInfo on Player {
        rankingLastPlaces {
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
      if (r?.lastRanking?.[this.data.type] != null) {
        this.p1t1Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p1t2.valueChanges.subscribe((r: Partial<Player>) => {
      if (r?.lastRanking?.[this.data.type] != null) {
        this.p1t2Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p2t1.valueChanges.subscribe((r: Partial<Player>) => {
      if (r?.lastRanking?.[this.data.type] != null) {
        this.p2t1Level.setValue(r.lastRanking?.[this.data.type]);
      }
    });

    this.p2t2.valueChanges.subscribe((r: Partial<Player>) => {
      if (r?.lastRanking?.[this.data.type] != null) {
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
    const players: GamePlayer[] = [];
    const rankingPoints: RankingPoint[] = [];

    const team1 = this.p1t1Level.value + (this.p2t1Level.value ?? 0);
    const team2 = this.p1t2Level.value + (this.p2t2Level.value ?? 0);

    const differenceInLevel = t1won
      ? (team1 - team2) / (this.data.type == 'single' ? 1 : 2)
      : (team2 - team1) / (this.data.type == 'single' ? 1 : 2);

    const p1t1Points = this._getWinningPoints(this.p1t1Level.value);
    const p2t1Points = this._getWinningPoints(this.p2t1Level.value);

    const p1t2Points = this._getWinningPoints(this.p1t2Level.value);
    const p2t2Points = this._getWinningPoints(this.p2t2Level.value);

    const team1Points =
      this.data.type == 'single' ? p1t1Points : (p1t1Points + p2t1Points) / 2;
    const team2Points =
      this.data.type == 'single' ? p1t2Points : (p1t2Points + p2t2Points) / 2;

    players.push({
      ...(this.p1t1.value as Partial<Player>),
      [this.data.type]: this.p1t1Level.value,
      team: 1,
      player: 1,
    } as GamePlayer);
    players.push({
      ...(this.p1t2.value as Partial<Player>),
      [this.data.type]: this.p1t2Level.value,
      team: 2,
      player: 1,
    } as GamePlayer);

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

    if (this.data.type !== 'single') {
      players.push({
        ...(this.p2t1.value as Partial<Player>),
        [this.data.type]: this.p2t1Level.value,
        team: 1,
        player: 2,
      } as GamePlayer);
      rankingPoints.push({
        playerId: this.p2t1?.value?.id,
        points: t1won ? team2Points : 0,
        differenceInLevel: t1won ? -differenceInLevel : differenceInLevel,
      });

      players.push({
        ...(this.p2t2.value as Partial<Player>),
        [this.data.type]: this.p2t2Level.value,
        team: 2,
        player: 2,
      } as GamePlayer);
      rankingPoints.push({
        playerId: this.p2t2?.value?.id,
        points: t1won ? 0 : team1Points,
        differenceInLevel: t1won ? differenceInLevel : -differenceInLevel,
      });
    }

    const game = new Game({
      id: uuidv4(),
      gameType:
        this.data.type == 'single'
          ? GameType.S
          : this.data.type == 'double'
            ? GameType.D
            : GameType.MX,
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
      (this.data?.system?.pointsWhenWinningAgainst?.length ?? 0) - level;

    return this.data?.system?.pointsWhenWinningAgainst?.[index] ?? 0;
  }
}
