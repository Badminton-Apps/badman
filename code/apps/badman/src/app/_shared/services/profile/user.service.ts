import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { ApmService } from '@elastic/apm-rum-angular';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, iif, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  shareReplay,
  tap,
} from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { apolloCache } from '../../../graphql.module';
import { Player, RequestLink } from '../../../_shared/models';

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
    const whenAuthenticated = combineLatest([
      apollo.query<{ me: Player }>({
        query: gql`
          query GetProfile {
            me {
              id
              slug
              fullName
              claims {
                name
              }
              clubs {
                id
                name
                slug
              }
            }
          }
        `,
      }),
    ]).pipe(
      map(([r]) => r.data?.me),
      filter((me) => me !== null),
      tap((me) => (this.profile = new Player(me) ?? undefined)),
      shareReplay(1)
    );

    this.profile$ = this.auth.user$.pipe(
      tap((user) => {
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

  requestLink(playerId: string): Observable<RequestLink> {
    return this.httpClient.post<RequestLink>(
      `${environment.api}/api/${environment.apiVersion}/request-link/${playerId}`,
      {}
    );
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
          // Clear from cache
          source.forEach((id) => {
            const normalizedId = apolloCache.identify({
              id,
              __typename: 'Player',
            });
            apolloCache.evict({ id: normalizedId });
          });
          apolloCache.gc();
        })
      );
  }
}
