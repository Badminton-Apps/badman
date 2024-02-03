import { CommonModule } from '@angular/common';
import { Component, OnInit, input } from '@angular/core';
import {
  EventCompetition,
  Player,
  SubEventCompetition,
  Team,
  ValidationMessage,
} from '@badman/frontend-models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'badman-enrollment-message',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './enrollment-message.component.html',
  styleUrls: ['./enrollment-message.component.scss'],
})
export class EnrollmentMessageComponent implements OnInit {
  validation = input<ValidationMessage | undefined>();

  translatedMessage$?: Observable<string>;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    if (this.validation()?.message == undefined) return;

    this.translatedMessage$ = this._getParams().pipe(
      switchMap((params) => {
        return this.translate.get(`${this.validation()?.message}`, params);
      }),
    );
  }

  private _getParams() {
    return combineLatest([
      this._getIndex(),
      this._getRequiredGender(),
      this._getPlayers(),
      this._getTeam(),
      this._getRanking(),
      this._getEvent(),
    ]).pipe(
      map(([index, gender, players, team, minLevel, event]) => {
        const params: {
          [key: string]: unknown;
        } = {};

        if (gender) {
          params['gender'] = gender;
        }

        return {
          ...params,
          ...players,
          ...index,
          ...team,
          ...minLevel,
          ...event,
        };
      }),
    );
  }

  private _getIndex() {
    const teamIndex = this.validation()?.params?.['teamIndex'] as string;
    const baseIndex = this.validation()?.params?.['baseIndex'] as string;
    const minIndex = this.validation()?.params?.['minIndex'] as string;
    const maxIndex = this.validation()?.params?.['maxIndex'] as string;

    return of({ teamIndex, minIndex, maxIndex, baseIndex });
  }

  private _getTeam() {
    const team = this.validation()?.params?.['team'] as Partial<Team>;

    return of({ team });
  }

  private _getRanking() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['minLevel']) {
      const minLevel = this.validation()?.params?.['minLevel'];
      params['minLevel'] = minLevel;
    }
    if (this.validation()?.params?.['rankingType']) {
      const rankingType = this.validation()?.params?.['rankingType'];
      params['rankingType'] = this.translate.instant(`all.ranking.${rankingType}`).toLowerCase();
    }

    return of(params);
  }

  private _getEvent() {
    const event = this.validation()?.params?.['event'] as Partial<EventCompetition>;
    const subEvent = this.validation()?.params?.['subEvent'] as Partial<SubEventCompetition>;

    return of({ event, subEvent });
  }

  private _getPlayers() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation()?.params?.['player']) {
      let player = this.validation()?.params?.['player'] as Partial<Player>;

      if (player.gender) {
        player = {
          ...player,
          gender: this._getGender(player.gender),
        } as Player;
      }

      params['player'] = player;
    }

    return of(params);
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
}
