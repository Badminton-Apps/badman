import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { AuthenticateService, LoggedinUser } from '@badman/frontend-auth';
import { GraphQLModule } from '@badman/frontend-graphql';
import { LanguageComponent } from '@badman/frontend-translation';
import { Observable } from 'rxjs';
import { ThemeSwitcherComponent } from '../theme-switcher';

@Component({
  selector: 'badman-header-menu',
  standalone: true,
  imports: [
    CommonModule,
    GraphQLModule,
    RouterModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    LanguageComponent,
    ThemeSwitcherComponent,
  ],
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.scss'],
})
export class HeaderMenuComponent implements OnInit {
  user$?: Observable<LoggedinUser>;

  constructor(private authenticateService: AuthenticateService) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$;
  }

  logout() {
    this.authenticateService.logout().subscribe();
  }

  login() {
    this.authenticateService.login()?.subscribe();
  }
}
