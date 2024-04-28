import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  input,
  inject,
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
  private elementRef = inject(ElementRef);
  private platformId = inject<string>(PLATFORM_ID);
  banner = input.required<Banner>();

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
