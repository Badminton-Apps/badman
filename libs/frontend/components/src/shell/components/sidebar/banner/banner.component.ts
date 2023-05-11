import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Banner } from '@badman/frontend-models';

@Component({
  selector: 'badman-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerComponent implements OnInit {
  @Input()
  banner!: Banner;

  constructor(
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: string
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
