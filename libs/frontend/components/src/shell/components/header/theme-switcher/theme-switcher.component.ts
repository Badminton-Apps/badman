import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeSwitcherService } from './theme-switcher.service';

@Component({
  selector: 'badman-theme-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss'],
})
export class ThemeSwitcherComponent implements OnInit {
  title = 'Angular material dark mode';
  current!: 'light' | 'dark';

  constructor(public colorSchemaService: ThemeSwitcherService) {
    this.colorSchemaService.load();
  }

  ngOnInit(): void {
    this.current = this.colorSchemaService.currentActive ?? this.colorSchemaService.defaultScheme;
  }

  setTheme(theme: 'light' | 'dark') {
    this.colorSchemaService.update(theme);
    this.current = theme;
  }
}
