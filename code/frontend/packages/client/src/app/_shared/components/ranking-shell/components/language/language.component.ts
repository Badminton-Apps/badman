import { NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { Component, OnInit } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { language_map } from 'app/_shared/factory';
import * as moment from 'moment';

@Component({
  selector: 'app-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
})
export class LanguageComponent implements OnInit {
  current: string;
  langs: string[];

  constructor(public translate: TranslateService, private _adapter: NgxMatDateAdapter<any>) {}

  ngOnInit(): void {
    this.langs = [...language_map.keys()];
    this.current = this.translate.currentLang;
  }

  async setLang(lang: string) {
    // Get value from map
    const values = language_map.get(lang);

    // Set values
    await this.translate.use(values.translate).toPromise();
    this._adapter.setLocale(values.adapter);
    moment.locale(values.moment);

    // Store
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
 