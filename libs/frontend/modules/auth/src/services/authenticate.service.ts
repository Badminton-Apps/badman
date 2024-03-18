import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { PopupLoginOptions, RedirectLoginOptions } from '@auth0/auth0-spa-js';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { Observable, from, fromEvent, iif, merge, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface AuthState {
  user: LoggedinUser | null;
  loaded: boolean;
}

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
  private authService = inject(AuthService);
  private apollo = inject(Apollo);

  // state
  initialState: AuthState = {
    user: { loggedIn: false } as LoggedinUser,
    loaded: false,
  };

  // selectors
  user = computed(() => this.state().user);
  loggedIn = computed(() => this.state().user?.loggedIn ?? false);

  // sources
  private loggedIn$ = merge(
    of(null),
    fromEvent(window, 'online'),
    fromEvent(window, 'offline'),
  ).pipe(
    map(() => navigator.onLine),
    switchMap((online) =>
      iif(
        () => online,
        this.authService?.isAuthenticated$.pipe(catchError(() => of(false))) ?? of(false),
        of(false),
      ),
    ),
  );

  private userLoad$ = this.loggedIn$.pipe(
    switchMap((loggedIn) =>
      iif(
        () => loggedIn,
        this.apollo
          .query<{ me: Partial<Player> }>({
            query: PROFILE_QUERY,
            fetchPolicy: 'network-only',
          })
          .pipe(
            switchMap((result) => {
              return (
                this.authService?.user$.pipe(
                  // return null if there is an error
                  map((user) => ({ ...user, ...result.data.me })),
                ) ?? of({})
              );
            }),
            map((result) => {
              const user = new LoggedinUser(result as Partial<LoggedinUser>);
              user.loggedIn = true;
              return user;
            }),
          ),
        of({ loggedIn: false } as LoggedinUser),
      ),
    ),
    map((user) => ({ user, loaded: true })),
  );

  //sources
  sources$ = merge(this.userLoad$);

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      logout: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() =>
            from(this.apollo.client.resetStore()).pipe(
              map(() =>
                this.authService?.logout({
                  logoutParams: {
                    returnTo: window.location.origin,
                  },
                }),
              ),
            ),
          ),
          map(() => ({ user: null, loaded: false }) as AuthState),
        ),
      login: (_state, action$: Observable<RedirectLoginOptions | PopupLoginOptions | void>) =>
        action$.pipe(
          switchMap(
            (args) =>
              this.authService?.loginWithPopup(args as RedirectLoginOptions | PopupLoginOptions) ??
              of(),
          ),
          switchMap(() => this.userLoad$),
        ),
    },
  });

  logout() {
    return from(this.apollo.client.resetStore()).pipe(
      map(() =>
        this.authService?.logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        }),
      ),
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
