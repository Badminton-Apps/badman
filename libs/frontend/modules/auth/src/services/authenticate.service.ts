import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { PopupLoginOptions, RedirectLoginOptions } from '@auth0/auth0-spa-js';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  Observable,
  from,
  fromEvent,
  iif,
  merge,
  of,
} from 'rxjs';
import {
  map,
  shareReplay,
  switchMap,
  tap,
  catchError,
  timeout,
} from 'rxjs/operators';

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
          start
          end
          membershipType
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
  loggedIn$!: Observable<boolean>;
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
      this.loggedIn$ = merge(
        of(null),
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      ).pipe(
        map(() => navigator.onLine),
        switchMap((online) =>
          iif(
            () => online,
            this.authService?.isAuthenticated$.pipe(
              catchError(() => of(false))
            ) ?? of(false),
            of(false)
          )
        )
      );
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
              // return null if there is an error
              map((user) => ({ ...user, ...result.data.me }))
            ) ?? of({})
          );
        }),
        map((result) => {
          const user = new LoggedinUser(result);
          user.loggedIn = true;
          return user;
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

export class LoggedinUser extends Player {
  loggedIn = false;
  nickname?: string;
  picture?: string;

  constructor(args: Partial<LoggedinUser>) {
    super(args);

    this.loggedIn = args?.loggedIn ?? false;
    this.nickname = args?.nickname;
    this.picture = args?.picture;
  }
}
