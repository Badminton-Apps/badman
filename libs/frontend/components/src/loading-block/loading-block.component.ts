import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'badman-loading-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-block.component.html',
  styleUrls: ['./loading-block.component.scss'],
})
export class LoadingBlockComponent {
  @Input()
  items = 3;


  @Input()
  height = '35px';

  @Input()
  subHeight?: string;

  @Input()
  width = '100%';

  @Input()
  @HostBinding('style.flex-direction')
  direction = 'column';

  @Input()
  @HostBinding('style.gap')
  gap = '1rem';

  @Input()
  subGap = '0.25rem';

  @Input()
  borderRadius = '0.25rem';


}
