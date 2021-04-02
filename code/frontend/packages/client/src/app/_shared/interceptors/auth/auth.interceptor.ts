import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, iif, of } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const withBearerToken$ = this.auth.getUserToken$().pipe(
      mergeMap(token =>
        next.handle(
          req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          })
        )
      ),
      catchError(err => throwError(err))
    );

    const withoutBearerToken = next.handle(req);

    return this.auth.isAuthenticated$.pipe(
      mergeMap(x => iif(() => x, withBearerToken$, withoutBearerToken))
    );
  }
}
