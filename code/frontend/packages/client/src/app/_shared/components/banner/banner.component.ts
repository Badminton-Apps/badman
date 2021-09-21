import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, Input, ElementRef } from '@angular/core';
import { Banner } from 'app/_shared';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent implements OnInit, AfterViewInit {
  banner: Banner;

  showAd = environment.adsense.show;
  dev = environment.production;

  @Input()
  adSlot: number;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.banner = new Banner(environment.adsense.adClient, this.adSlot, 'rectangle', false);

    // Google no touchy
    const observer = new MutationObserver((mutations, observer) => {
      this.elementRef.nativeElement.style.height = '';
      this.elementRef.nativeElement.style.minHeight = '';
    });

    observer.observe(this.elementRef.nativeElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try {
        (window['adsbygoogle'] = window['adsbygoogle'] || []).push({});
      } catch (e) {
        console.error(e);
      }
    }, 0);
  }
}
