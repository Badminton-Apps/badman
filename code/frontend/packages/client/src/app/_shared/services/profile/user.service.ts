import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, iif, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, mergeMap, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { RequestLink, Player } from '../../../_shared/models';
import { environment } from '../../../../environments/environment';
import { AuthService } from '@auth0/auth0-angular';
import { apolloCache } from 'app/graphql.module';
import { ApmService } from '@elastic/apm-rum-angular';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase = `${environment.api}/api/${environment.apiVersion}/user`;
  private updateHappend$ = new BehaviorSubject(null);

  profile$: Observable<{ player: Player; request: any } | { player: null; request: null } | null>;
  profile?: Player;

  constructor(private httpClient: HttpClient, private auth: AuthService, private apmService: ApmService) {
    const whenAuthenticated = this.updateHappend$.pipe(
      switchMap((_) => this.httpClient.get<{ player: Player; request: any }>(`${this.urlBase}/profile`)),
      startWith({ player: null, request: null }),
      filter((user) => user !== null),
      tap(({ player }) => (this.profile = player!)),
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
      mergeMap((x) => iif(() => x != null && x != undefined, whenAuthenticated, of(null))),
      distinctUntilChanged(),
      shareReplay()
    );
  }

  profileUpdated() {
    this.updateHappend$.next(null);
  }

  requestLink(playerId: string): Observable<RequestLink> {
    return this.httpClient.post<RequestLink>(
      `${environment.api}/api/${environment.apiVersion}/request-link/${playerId}`,
      {}
    );
  }

  mergeAccoutns(destination: string, source: string[], canBeDifferentMemberId: boolean): Observable<void> {
    return this.httpClient
      .post<void>(`${this.urlBase}/merge-accounts`, {
        playerId: destination,
        playerIdToMerge: source,
        canBeDifferentMemberId,
      })
      .pipe(
        tap((_) => {
          // Clear from cache
          source.forEach((id) => {
            const normalizedId = apolloCache.identify({ id, __typename: 'Player' });
            apolloCache.evict({ id: normalizedId });
          });
          apolloCache.gc();
        })
      );
  }
}
