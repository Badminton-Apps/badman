import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { SerieData } from '../interfaces';

@Component({
  selector: 'badman-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphsComponent {
  @Input()
  levels!: number[];

  @Input()
  seriesData!: SerieData;
}
