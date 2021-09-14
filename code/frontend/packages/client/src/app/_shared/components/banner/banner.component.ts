import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, Input } from '@angular/core';
import { Banner } from 'app/_shared';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerComponent implements AfterViewInit {

  banner: Banner;
  showAd = environment.adsense.show;
  constructor() {
    this.banner = new Banner(
      environment.adsense.adClient,
      4690724012,
      'auto',
      true
    )
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try {
        (window['adsbygoogle'] = window['adsbygoogle'] || []).push({
          overlays: { bottom: true }
        });
      } catch (e) {
        console.error(e);
      }
    }, 0);
  }

}