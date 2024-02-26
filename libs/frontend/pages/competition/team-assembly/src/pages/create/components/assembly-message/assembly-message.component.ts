import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ValidationMessage, ValidationPlayer } from '../../models/validation';
import { input } from '@angular/core';

@Component({
  selector: 'badman-assembly-message',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './assembly-message.component.html',
  styleUrls: ['./assembly-message.component.scss'],
})
export class AssemblyMessageComponent implements OnInit {
  validation = input<ValidationMessage | undefined>();

  translatedMessage$?: Observable<string>;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    if (this.validation()?.message == undefined) return;

    this.translatedMessage$ = this._getParams().pipe(
      switchMap((params) => this.translate.get(`${this.validation()?.message}`, params)),
    );
  }

  private _getParams() {
    return combineLatest([
      this._getGame('game1'),
      this._getGame('game2'),
      this._getRequiredGender(),
      this._getPlayers(),
      this._getIndex(),
      this._getMax(),
      this._getMaxLevel(),
    ]).pipe(
      map(([game1, game2, gender, players, index, minMax, maxLevel]) => {
        const params: {
          [key: string]: unknown;
        } = {};

        if (game1) {
          params['game1'] = game1.toLowerCase();
        }

        if (game2) {
          params['game2'] = game2.toLowerCase();
        }

        if (gender) {
          params['gender'] = gender;
        }

        if (minMax?.['max']) {
          params['max'] = minMax?.['max'];
        }

        return { ...params, ...players, ...index, ...maxLevel };
      }),
    );
  }

  private _getGame(gameKey: 'game1' | 'game2') {
    const game = this.validation()?.params?.[gameKey];
    if (!game) return of(undefined);

    return this.translate.get(`all.competition.team-assembly.${game}`);
  }

  private _getRequiredGender() {
    const gender = this.validation()?.params?.['gender'] as string;
    if (!gender) return of(undefined);

    return of(this._getGender(gender));
  }

  private _getGender(gender: string) {
    let genderTranslated: string;
    switch (gender) {
      case 'F':
        genderTranslated = this.translate.instant(`all.gender.female`);
        break;
      case 'M':
        genderTranslated = this.translate.instant(`all.gender.male`);
        break;
      default:
        genderTranslated = this.translate.instant(`all.gender.${gender}`);
        break;
    }

    return genderTranslated.toLocaleLowerCase() as 'F' | 'M';
  }

  private _getPlayers() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['team1player1']) {
      const team1player1 = this.validation()?.params?.['team1player1'] as ValidationPlayer;
      params['team1player1'] = team1player1;
    }

    if (this.validation()?.params?.['team1player2']) {
      const team1player2 = this.validation()?.params?.['team1player2'] as ValidationPlayer;
      params['team1player2'] = team1player2;
    }

    if (this.validation()?.params?.['team2player1']) {
      const team2player1 = this.validation()?.params?.['team2player1'] as ValidationPlayer;
      params['team2player1'] = team2player1;
    }

    if (this.validation()?.params?.['team2player2']) {
      const team2player2 = this.validation()?.params?.['team2player2'] as ValidationPlayer;
      params['team2player2'] = team2player2;
    }

    if (this.validation()?.params?.['player1']) {
      const player1 = this.validation()?.params?.['player1'] as ValidationPlayer;

      if (player1.gender) {
        player1.gender = this._getGender(player1.gender);
      }

      params['player1'] = player1;
    }

    if (this.validation()?.params?.['player2']) {
      const player2 = this.validation()?.params?.['player2'] as ValidationPlayer;

      if (player2.gender) {
        player2.gender = this._getGender(player2.gender);
      }

      params['player2'] = player2;
    }

    if (this.validation()?.params?.['player']) {
      const player = this.validation()?.params?.['player'] as ValidationPlayer;
      if (player.gender) {
        player.gender = this._getGender(player.gender);
      }

      params['player'] = player;
    }

    return of(params);
  }

  private _getMax() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['max']) {
      const max = this.validation()?.params?.['max'] as ValidationPlayer;
      params['max'] = max;
    }

    return of(params);
  }

  private _getIndex() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['teamIndex']) {
      const teamIndex = this.validation()?.params?.['teamIndex'] as ValidationPlayer;
      params['teamIndex'] = teamIndex;
    }

    if (this.validation()?.params?.['baseIndex']) {
      const baseIndex = this.validation()?.params?.['baseIndex'] as ValidationPlayer;
      params['baseIndex'] = baseIndex;
    }

    if (this.validation()?.params?.['minIndex']) {
      const minIndex = this.validation()?.params?.['minIndex'] as ValidationPlayer;
      params['minIndex'] = minIndex;
    }

    return of(params);
  }

  private _getMaxLevel() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['minLevel']) {
      const minLevel = this.validation()?.params?.['minLevel'] as ValidationPlayer;
      params['minLevel'] = minLevel;
    }
    if (this.validation()?.params?.['rankingType']) {
      const rankingType = this.validation()?.params?.['rankingType'] as ValidationPlayer;
      params['rankingType'] = this.translate.instant(`all.ranking.${rankingType}`).toLowerCase();
    }

    return of(params);
  }
}
