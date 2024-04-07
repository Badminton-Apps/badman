import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthModule } from '@auth0/auth0-angular';
import { AUTH, USER } from '@badman/frontend-modules-auth';

@Component({
  selector: 'badman-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,

    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatListModule,
    MatTooltipModule,

    AuthModule,
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  breakpointObserver = inject(BreakpointObserver);
  // user = inject(USER);
  // auth = inject(AUTH);

  isHandset = toSignal(
    this.breakpointObserver
      .observe(['(max-width: 959.98px)'])
      .pipe(map((result) => result.matches)),
  );
  isServer = isPlatformBrowser(inject(PLATFORM_ID)) === false;
  showSidenav = computed(
    () => this.isHandset() === false && this.isServer === false,
  );

  loading = false;

  // login() {
  //   this.auth.loginWithRedirect();
  // }

  // logout() {
  //   this.auth.logout({
  //     logoutParams: {
  //       returnTo: document?.location.origin,
  //     },
  //   });
  // }
}
