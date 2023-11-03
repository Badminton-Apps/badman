import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  QueryList,
} from '@angular/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'badman-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent implements AfterContentInit {
  private destroy$ = injectDestroy();
  public hasAvatar?: boolean;

  @ContentChildren('avatar') content?: QueryList<ElementRef>;

  ngAfterContentInit(): void {
    if (!this.content) return;

    this.hasAvatar = this.content.length > 0;
    this.content.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.content) return;
      this.hasAvatar = this.content.length > 0;
    });
  }
}
