import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'badman-loading-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-block.component.html',
  styleUrls: ['./loading-block.component.scss'],
    
})
export class LoadingBlockComponent {
  items = input(3);

  height = input('35px');

  subHeight = input<string >();

  width = input('100%');

  direction = input('column');

  gap = input('1rem');

  subGap = input('0.25rem');

  borderRadius = input('0.25rem');
}
