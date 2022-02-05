import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from 'environments/environment';
import {
  BehaviorSubject,
  combineLatest,
  exhaustMap,
  filter,
  Observable,
  shareReplay,
  startWith,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  public userPermissions$!: Observable<string[]>;
  private update$ = new BehaviorSubject(null);

  constructor(private authService: AuthService, private httpClient: HttpClient) {
    this.userPermissions$ = combineLatest([this.authService.user$, this.update$]).pipe(
      filter(([profile]) => profile != null),
      startWith(false),
      exhaustMap((_) => this.httpClient.get<string[]>(`${environment.api}/${environment.apiVersion}/user/permissions`)),
      shareReplay(1)
    );
  }

  reloadPermissions(): void {
    this.update$.next(null);
  }
}
