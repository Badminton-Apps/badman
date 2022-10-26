import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, iif, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  mergeMap,
  shareReplay,
  tap,
} from 'rxjs/operators';
import { Player } from '@badman/frontend-models';
import { ConfigService } from '@badman/frontend-config';
import { apolloCache } from '@badman/frontend-graphql';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase: string;
  private update$ = new BehaviorSubject(null);

  profile$: Observable<Player | null | undefined>;
  profile?: Player;

  constructor(
    private configService: ConfigService,
    private httpClient: HttpClient,
    apollo: Apollo,
    private auth: AuthService
  ) {
    this.urlBase = `${this.configService.apiBaseUrl}/user`;

    const whenAuthenticated = apollo
      .query<{ me: Player }>({
        query: gql`
          query GetProfile {
            me {
              id
              slug
              fullName
              permissions
              clubs {
                id
                name
                slug
                clubMembership {
                  active
                  end
                }
              }
            }
          }
        `,
      })
      .pipe(
        map((r) => r.data?.me),
        tap((me) => (this.profile = new Player(me) ?? undefined))
      );

    this.profile$ = combineLatest([this.auth.user$, this.update$]).pipe(
      mergeMap((x) =>
        iif(() => x != null && x != undefined, whenAuthenticated, of(null))
      ),
      distinctUntilChanged(),
      shareReplay()
    );
  }

  reloadProfile(): void {
    this.update$.next(null);
  }

  mergeAccoutns(
    destination: string,
    source: string[],
    canBeDifferentMemberId: boolean
  ): Observable<void> {
    return this.httpClient
      .post<void>(`${this.urlBase}/merge-accounts`, {
        playerId: destination,
        playerIdToMerge: source,
        canBeDifferentMemberId,
      })
      .pipe(
        tap(() => {
          this.clearUserCache(source);
        })
      );
  }

  clearUserCache(users: string[]): void {
    // Clear from cache
    users.forEach((id) => {
      const normalizedId = apolloCache.identify({
        id,
        __typename: 'Player',
      });
      apolloCache.evict({ id: normalizedId });
    });
    apolloCache.gc();
  }
}
