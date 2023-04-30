import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Player } from '@badman/frontend-models';
import { ValidationMessage } from '../../../../../models';

@Component({
  selector: 'badman-enrollment-message',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './enrollment-message.component.html',
  styleUrls: ['./enrollment-message.component.scss'],
})
export class EnrollmentMessageComponent implements OnInit {
  @Input() validation?: ValidationMessage;

  translatedMessage$?: Observable<string>;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    if (this.validation?.message == undefined) return;

    this.translatedMessage$ = this._getParams().pipe(
      switchMap((params) => {
        return this.translate.get(`${this.validation?.message}`, params);
      })
    );
  }

  private _getParams() {
    return combineLatest([
      this._getIndex(),
      this._getRequiredGender(),
      this._getPlayers(),
    ]).pipe(
      map(([index, gender, players]) => {
        const params: {
          [key: string]: unknown;
        } = {};

        if (gender) {
          params['gender'] = gender;
        }

        return { ...params, ...players, ...index };
      })
    );
  }

  private _getIndex() {
    const teamIndex = this.validation?.params?.['teamIndex'] as string;
    const baseIndex = this.validation?.params?.['baseIndex'] as string;
    const minIndex = this.validation?.params?.['minIndex'] as string;
    const maxIndex = this.validation?.params?.['maxIndex'] as string;

    return of({ teamIndex, minIndex, maxIndex, baseIndex });
  }

  private _getPlayers() {
    const params: {
      [key: string]: unknown;
    } = {};

    if (this.validation?.params?.['player']) {
      let player = this.validation?.params?.['player'] as Partial<Player>;

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
    const gender = this.validation?.params?.['gender'] as string;
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
