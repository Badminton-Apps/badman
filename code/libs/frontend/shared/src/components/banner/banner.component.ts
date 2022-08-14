import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  AfterViewInit,
  Input,
  ElementRef,
} from '@angular/core';
import { ConfigService } from '@badman/frontend/config';
import { Banner } from '@badman/frontend/models';

@Component({
  selector: 'badman-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent implements OnInit, AfterViewInit {
  banner!: Banner;

  showAd = false;

  @Input()
  adSlot!: number;

  constructor(
    private elementRef: ElementRef,
    private configService: ConfigService
  ) {}

  ngOnInit() {
    this.showAd = this.configService.appConfig?.adsense?.show ?? false;

    this.banner = new Banner(
      this.configService.appConfig?.adsense.adClient,
      this.adSlot,
      'rectangle',
      false
    );

    // Google no touchy
    const observer = new MutationObserver(() => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any)['adsbygoogle'] =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any)['adsbygoogle'] || []).push({});
      } catch (e) {
        console.error(e);
      }
    }, 0);
  }
}
