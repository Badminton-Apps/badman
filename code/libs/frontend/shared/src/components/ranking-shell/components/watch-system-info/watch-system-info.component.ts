import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SystemService } from '@badman/frontend-ranking';

@Component({
  selector: 'badman-watch-system-info',
  templateUrl: './watch-system-info.component.html',
  styleUrls: ['./watch-system-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchSystemInfoComponent {
  @Input()
  isMobile = false;

  constructor(public systemService: SystemService) {}
}
