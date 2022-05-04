import { MediaMatcher } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  mobileQuery: any;

  constructor(media: MediaMatcher) {
    this.mobileQuery = media.matchMedia('screen and (max-width: 600px)');
  }

  addEvent(evnt: any, func: (ev: any) => any) {
    if (this.mobileQuery.addEventListener) {
      this.mobileQuery.addEventListener(evnt, func, false);
    } else if (this.mobileQuery.attachEvent) {
      this.mobileQuery.attachEvent('on' + evnt, func);
    } else {
      this.mobileQuery['on' + evnt] = func;
    }
  }

  removeEvent(evnt: any, func: (ev: any) => any) {
    if (this.mobileQuery.removeEventListener) {
      this.mobileQuery.removeEventListener(evnt, func, false);
    } else if (this.mobileQuery.detachEvent) {
      this.mobileQuery.detachEvent('on' + evnt, func);
    } else {
      this.mobileQuery['on' + evnt] = func;
    }
  }
}
