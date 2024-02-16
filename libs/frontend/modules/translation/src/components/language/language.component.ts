import {
  NgxMatMomentAdapter,
  NgxMatMomentModule,
} from '@angular-material-components/moment-adapter';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AvaliableLanguages, languages } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { setLanguage } from '../../factory';

@Component({
  selector: 'badman-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgxMatMomentModule,
    TranslateModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class LanguageComponent implements OnInit {
  current!: string;
  langs!: AvaliableLanguages[];

  constructor(
    public translate: TranslateService,
    private _adapter: DateAdapter<NgxMatMomentAdapter>,
  ) {}

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

    await setLanguage(values.translate, values.moment, this._adapter, this.translate);

    // Store
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
