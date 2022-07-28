import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { ApmService } from '@elastic/apm-rum-angular';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, iif, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  mergeMap,
  shareReplay,
  tap,
} from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { apolloCache } from '../../../graphql.module';
import { Player } from '../../../_shared/models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase = `${environment.api}/api/${environment.apiVersion}/user`;
  private update$ = new BehaviorSubject(null);

  profile$: Observable<Player | null | undefined>;
  profile?: Player;

  constructor(
    private httpClient: HttpClient,
    apollo: Apollo,
    private auth: AuthService,
    private apmService: ApmService
  ) {
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
      tap(([user]) => {
        this.apmService.apm.setUserContext({
          username: user?.name,
          email: user?.email,
          id: user?.sub,
        });
      }),
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
