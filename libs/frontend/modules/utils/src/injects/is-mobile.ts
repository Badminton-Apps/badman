import { BreakpointObserver } from '@angular/cdk/layout';
import { InjectionToken, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export const DEVICE = new InjectionToken('DEVICE', {
  providedIn: 'root',
  factory: () => {
    const breakpointObserver = inject(BreakpointObserver);
    return toSignal(
      breakpointObserver
        .observe(['(max-width: 959.98px)'])
        .pipe(map((result) => result.matches)),
    );
  },
});
