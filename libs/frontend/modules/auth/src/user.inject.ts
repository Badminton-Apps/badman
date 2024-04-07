import { isPlatformServer } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@auth0/auth0-angular';
import { Apollo, gql } from 'apollo-angular';
import { filter, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const USER$ = new InjectionToken('USER', {
  providedIn: 'root',
  factory: () => {
    const platform = inject(PLATFORM_ID);
    if (isPlatformServer(platform)) {
      return of({
        id: undefined,
        firstName: undefined,
        lastName: undefined,
      } as const as {
        id: string | undefined;
        firstName: string | undefined;
        lastName: string | undefined;
      });
    }

    const auth = inject(AuthService);
    const apollo = inject(Apollo);
    return auth.user$.pipe(
      filter((user) => !!user),
      switchMap(() =>
        apollo.query<{
          me: {
            id: string;
            firstName: string;
            lastName: string;
          };
        }>({
          query: gql`
            query {
              me {
                id
                firstName
                lastName
              }
            }
          `,
        }),
      ),
      map((result) => result.data.me),
    );
  },
});

export const USER = new InjectionToken('USER', {
  providedIn: 'root',
  factory: () => {
    const user = inject(USER$);

    if (!user) {
      return signal(undefined);
    }

    return toSignal(user);
  },
});
