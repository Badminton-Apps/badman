import { isPlatformServer } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

export const AUTH = new InjectionToken('AUTH', {
  providedIn: 'root',
  factory: () => {
    const platform = inject(PLATFORM_ID);
    if (isPlatformServer(platform)) {
      return {
        loginWithRedirect: () => {
          return Promise.resolve();
        },
        logout: () => {
          return Promise.resolve();
        },
        isAuthenticated$: of(false),
        user$: of(null),
      };
    }

    return inject(AuthService);
  },
});
