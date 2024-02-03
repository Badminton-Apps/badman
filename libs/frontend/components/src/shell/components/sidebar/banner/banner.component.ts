import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  input,
} from '@angular/core';
import { Banner } from '@badman/frontend-models';

@Component({
  selector: 'badman-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent implements OnInit {
  banner = input.required<Banner>();

  constructor(
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
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
  }
}
