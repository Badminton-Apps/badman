
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { AuthenticateService } from '@badman/frontend-auth';
import { GraphQLModule } from '@badman/frontend-graphql';
import { LanguageComponent } from '@badman/frontend-translation';
import { ThemeSwitcherComponent } from '../theme-switcher';

@Component({
    selector: 'badman-header-menu',
    imports: [
    GraphQLModule,
    RouterModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    LanguageComponent,
    ThemeSwitcherComponent
],
    templateUrl: './header-menu.component.html',
    styleUrls: ['./header-menu.component.scss']
})
export class HeaderMenuComponent {
  auth = inject(AuthenticateService);

  logout() {
    this.auth.state.logout();
  }

  login() {
    this.auth.state.login();
  }
}
