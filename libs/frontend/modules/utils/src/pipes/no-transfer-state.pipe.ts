import { isPlatformServer } from '@angular/common';
import { Observable } from 'rxjs';

export function noTransferState<T>(platformId: string) {
  return (source: Observable<T | null>) => {
    // Return the source observable if we're on the client
    // else return an empty observable

    return new Observable<T | null>((observer) => {
      if (isPlatformServer(platformId)) {
        observer.next(null);
        observer.complete();
      } else {
        source.subscribe(observer);
      }
    });
  };
}
