import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
})
export class LanguageComponent implements OnInit {
  current: string;
  langs: string[];

  constructor(public translate: TranslateService) {}

  ngOnInit(): void {
    this.langs = this.translate.getLangs();
    this.current = this.translate.currentLang;
  }

  setLang(lang: string) {
    this.translate.use(lang);
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
