import { isPlatformServer } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export function transferState<T>(
  key: string,
  transferStateService: TransferState,
  platformId: unknown,
): (source: Observable<T | null>) => Observable<T | null> {
  if (!transferStateService) {
    // return (source: Observable<T | null>) => source;
    return (source) => source;
  }

  if (!platformId) {
    return (source) => source;
  }

  return (source: Observable<T | null>) => {
    return new Observable<T | null>((observer) => {
      const STATE_KEY = makeStateKey<T>(key);
      if (transferStateService.hasKey(STATE_KEY)) {
        const state = transferStateService.get<T | null>(STATE_KEY, null);
        observer.next(state);
        observer.complete();
      } else {
        source
          .pipe(
            tap((teams) => {
              if (isPlatformServer(platformId)) {
                transferStateService.set(STATE_KEY, teams);
              }
            }),
          )
          .subscribe(observer);
      }
    });
  };
}
