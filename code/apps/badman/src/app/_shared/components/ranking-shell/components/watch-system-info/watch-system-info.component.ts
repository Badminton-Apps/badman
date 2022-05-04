import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { SystemService } from 'app/_shared';

@Component({
  selector: 'badman-watch-system-info',
  templateUrl: './watch-system-info.component.html',
  styleUrls: ['./watch-system-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchSystemInfoComponent {
  @Input()
  isMobile: boolean = false;

  constructor(public systemService: SystemService) {}
}
