import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  QueryList,
  ElementRef,
  AfterContentInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'badman-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent implements AfterContentInit, OnDestroy {
  private _avatarSub?: Subscription;
  public hasAvatar?: boolean;

  @ContentChildren('avatar') content?: QueryList<ElementRef>;

  ngAfterContentInit(): void {
    if (!this.content) return;

    this.hasAvatar = this.content.length > 0;
    this._avatarSub = this.content.changes.subscribe(() => {
      if (!this.content) return;
      this.hasAvatar = this.content.length > 0;
    });
  }

  ngOnDestroy() {
    this._avatarSub?.unsubscribe();
  }
}
