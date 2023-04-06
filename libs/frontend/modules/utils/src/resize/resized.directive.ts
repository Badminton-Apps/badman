/* eslint-disable @angular-eslint/directive-selector */
import {
  Directive,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { throttleTime } from 'rxjs/operators';
import { ResizedEvent } from './resized.event';

@Directive({
  selector: '[resized]',
})
export class ResizedDirective implements OnInit, OnDestroy {
  private observer: ResizeObserver;
  private oldRect?: DOMRectReadOnly;
  private resizeEvent = new EventEmitter<ResizedEvent>();

  @Output()
  public readonly resized;

  public constructor(
    private readonly element: ElementRef,
    private readonly zone: NgZone
  ) {
    this.resized = this.resizeEvent.pipe(throttleTime(1000 / 60));
    this.observer = new ResizeObserver((entries) =>
      this.zone.run(() => this.observe(entries))
    );
  }

  public ngOnInit(): void {
    this.observer.observe(this.element.nativeElement);
  }

  public ngOnDestroy(): void {
    this.observer.disconnect();
  }

  private observe(entries: ResizeObserverEntry[]): void {
    const domSize = entries[0];
    const resizedEvent = new ResizedEvent(domSize.contentRect, this.oldRect);
    this.oldRect = domSize.contentRect;
    this.resizeEvent.emit(resizedEvent);
  }
}
