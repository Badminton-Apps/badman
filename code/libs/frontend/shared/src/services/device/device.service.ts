import { MediaMatcher } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  mobileQuery: MediaQueryList;

  constructor(media: MediaMatcher) {
    this.mobileQuery = media.matchMedia('screen and (max-width: 600px)');
  }

  addEvent(evnt: 'change', func: (ev: unknown) => unknown) {
    if (this.mobileQuery.addEventListener) {
      this.mobileQuery.addEventListener(evnt, func, false);
    } else {
      this.mobileQuery[`on${evnt}`] = func;
    }
  }

  removeEvent(evnt: 'change', func: (ev: unknown) => unknown) {
    if (this.mobileQuery.removeEventListener) {
      this.mobileQuery.removeEventListener(evnt, func, false);
    } else {
      this.mobileQuery[`on${evnt}`] = func;
    }
  }
}
