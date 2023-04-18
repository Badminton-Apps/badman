import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformServer } from '@angular/common';
import { RootInjector } from '../root-injector';
import { PLATFORM_ID } from '@angular/core';
import { TransferState, makeStateKey } from '@angular/platform-browser';

export function transferState<T>(key: string) {
  const transferStateService = RootInjector.get(TransferState);
  const platformId = RootInjector.get(PLATFORM_ID);

  if (!transferStateService) {
    throw new Error(
      'TransferStateService is undefined. Please check RootInjector.rootInjector value.'
    );
  }

  if (!platformId) {
    throw new Error(
      'PLATFORM_ID is undefined. Please check RootInjector.rootInjector value.'
    ); 
  }

  return (source: Observable<T | null>) => {
    return new Observable<T | null>((observer) => {
      const STATE_KEY = makeStateKey<T>(key);
      if (transferStateService.hasKey(STATE_KEY)) {
        console.log('transfered')
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
            })
          )
          .subscribe(observer);
      }
    });
  };
}
