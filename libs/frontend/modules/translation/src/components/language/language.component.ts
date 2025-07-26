import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AvaliableLanguages, languages } from '@badman/utils';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { setLanguage } from '../../factory';
import { MomentDatetimeAdapter } from '@ng-matero/extensions-moment-adapter';
import { DatetimeAdapter } from '@ng-matero/extensions/core';

@Component({
  selector: 'badman-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
  imports: [CommonModule, TranslatePipe, MatMenuModule, MatButtonModule, MatIconModule],
})
export class LanguageComponent implements OnInit {
  public translate = inject(TranslateService);
  private _adapter = inject<DateAdapter<unknown, unknown>>(DateAdapter);
  private _dateTimeadapter = inject<DatetimeAdapter<MomentDatetimeAdapter>>(
    DatetimeAdapter<MomentDatetimeAdapter>,
  );

  current!: string;
  langs!: AvaliableLanguages[];

  ngOnInit(): void {
    this.langs = Object.values(AvaliableLanguages);
    this.current = this.translate.currentLang;
  }

  async setLang(lang: AvaliableLanguages) {
    // Get value from map
    const values = languages.get(lang);
    if (!values) {
      return;
    }

    await setLanguage(
      values.translate,
      values.moment,
      values.adapter,
      this._adapter,
      this._dateTimeadapter,
      this.translate,
    );

    // Store
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
