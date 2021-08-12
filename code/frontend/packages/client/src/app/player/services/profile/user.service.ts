import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { iif, Observable, of } from 'rxjs';
import { filter, mergeMap, shareReplay, startWith, tap } from 'rxjs/operators';
import { RequestLink, RankingPlace, Player } from '../../../_shared/models';
import { AuthService } from '../../../_shared/services';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase = `${environment.api}/${environment.apiVersion}/user`;
  
  profile$: Observable<{ player: Player; request: any }>;
  profile: Player;

  constructor(private httpClient: HttpClient, private auth: AuthService) {
    const whenAuthenticated = this.httpClient
      .get<{ player: Player; request: any }>(`${this.urlBase}/profile`)
      .pipe(
        startWith({ player: null, request: null }),
        filter((user) => user !== null),
        tap(({ player }) => this.profile = player),
        shareReplay(1)
      );
    this.profile$ = this.auth.userProfile$.pipe(
      mergeMap((x) => iif(() => x, whenAuthenticated, of(null)))
    );
  }

  requestLink(playerId: string): Observable<RequestLink> {
    return this.httpClient.post<RequestLink>(
      `${environment.api}/${environment.apiVersion}/request-link/${playerId}`,
      {}
    );
  }

  permissions(){
    return this.auth.userPermissions$;
  }
}
