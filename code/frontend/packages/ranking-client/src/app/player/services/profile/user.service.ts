import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { iif, Observable, of } from 'rxjs';
import { filter, mergeMap, shareReplay, startWith, tap } from 'rxjs/operators';
import { User, RequestLink, RankingPlace } from '../../../_shared/models';
import { AuthService } from '../../../_shared/services';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private urlBase = `${environment.api}/${environment.apiVersion}/user`;
  profile$: Observable<{ player: User; request: any }>;

  constructor(private httpClient: HttpClient, private auth: AuthService) {
    const whenAuthenticated = this.httpClient
      .get<{ player: User; request: any }>(`${this.urlBase}/profile`)
      .pipe(
        startWith({ player: null, request: null }),
        filter((user) => user !== null),
        shareReplay(1)
      );
    this.profile$ = this.auth.userProfile$.pipe(
      mergeMap((x) => iif(() => x, whenAuthenticated, of(null)))
    );
  }

  requestLink(playerId: number): Observable<RequestLink> {
    return this.httpClient.post<RequestLink>(
      `${environment.api}/${environment.apiVersion}/request-link/${playerId}`,
      {}
    );
  }

  canCalculateRanking() {
    return this.auth.hasClaim$('calculate:ranking');
  }
  canAcceptLinks() {
    return this.auth.hasClaim$('link:account');
  }
  canViewEvents() {
    return this.auth.hasClaim$('view:event');
  }

  canImportEvents() {
    return this.auth.hasClaim$('import:event');
  }

 
}
