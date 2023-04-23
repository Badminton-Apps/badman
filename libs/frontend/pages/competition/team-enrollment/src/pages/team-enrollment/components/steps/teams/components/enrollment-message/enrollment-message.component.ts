import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
      switchMap((params) =>
        this.translate.get(`${this.validation?.message}`, params)
      )
    );
  }

  private _getParams() {
    return combineLatest([this._getIndex()]).pipe(
      map(() => {
        const params: {
          [key: string]: unknown;
        } = {};

        return { ...params };
      })
    );
  }

  private _getIndex() {
    const params: {
      [key: string]: unknown;
    } = {};

    const teamIndex = this.validation?.params?.['teamIndex'] as string;
    const minIndex = this.validation?.params?.['minIndex'] as string;
    const maxIndex = this.validation?.params?.['maxIndex'] as string;

    return of({ ...params, teamIndex, minIndex, maxIndex });
  }
}
