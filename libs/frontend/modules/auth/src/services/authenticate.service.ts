import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { PopupLoginOptions, RedirectLoginOptions } from '@auth0/auth0-spa-js';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, Observable, from, iif, of } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

const PROFILE_QUERY = gql`
  query GetProfile {
    me {
      id
      slug
      firstName
      fullName
      permissions
      email
      clubs {
        id
        name
        slug
        clubMembership {
          end
        }
      }
      setting {
        language
      }
    }
  }
`;
@Injectable({
  providedIn: 'root',
})
export class AuthenticateService {
  user$!: Observable<LoggedinUser>;
  loggedIn$?: Observable<boolean>;
  authService?: AuthService;

  #user = new BehaviorSubject<LoggedinUser | null>(null);
  get user() {
    return this.#user.value;
  }

  #loggedIn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  get loggedIn() {
    return this.#loggedIn.value;
  }

  constructor(
    private apollo: Apollo,
    @Inject(PLATFORM_ID) private _platformId: string,
    private injector: Injector
  ) {
    if (isPlatformBrowser(this._platformId)) {
      this.authService = this.injector.get(AuthService);
      this.loggedIn$ = this.authService.isAuthenticated$;
    } else {
      this.loggedIn$ = of(false);
    }

    const fetchInfo = this.apollo
      .query<{ me: Partial<Player> }>({
        query: PROFILE_QUERY,
        fetchPolicy: 'network-only',
      })
      .pipe(
        switchMap((result) => {
          return (
            this.authService?.user$.pipe(
              map((user) => ({ ...user, ...new Player(result.data.me) }))
            ) ?? of({})
          );
        }),
        map((result) => {
          return {
            ...result,
            loggedIn: true,
          } as LoggedinUser;
        })
      );

    this.user$ = this.loggedIn$.pipe(
      switchMap((loggedIn) =>
        iif(() => loggedIn, fetchInfo, of({ loggedIn: false } as LoggedinUser))
      ),
      shareReplay(),
      tap((user) => {
        this.#user.next(user);
        this.#loggedIn.next(user.loggedIn);
      })
    );
  }

  logout() {
    return from(this.apollo.client.resetStore()).pipe(
      map(() =>
        this.authService?.logout({
          openUrl: false,
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
      )
    );
  }

  login(popup = true, args?: RedirectLoginOptions | PopupLoginOptions) {
    return popup
      ? this.authService?.loginWithPopup(args)
      : this.authService?.loginWithRedirect(args) ?? of();
  }
}

export interface LoggedinUser extends Player {
  loggedIn: boolean;
  nickname: string;
  picture: string;
  sub: string;
}
