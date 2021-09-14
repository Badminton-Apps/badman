import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, Input } from '@angular/core';
import { Banner } from 'app/_shared';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerComponent implements OnInit,AfterViewInit {

  banner: Banner;
  showAd = environment.adsense.show;
  @Input()
  adSlot: number;

  ngOnInit() {
    this.banner = new Banner(
      environment.adsense.adClient,
      this.adSlot,
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