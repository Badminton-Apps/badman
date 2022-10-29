import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { SerieDataType } from '../interfaces';

@Component({
  selector: 'badman-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphComponent {
  @Input()
  levels!: number[];

  @Input()
  title!: string;

  @Input()
  seriesData!: SerieDataType[];
}
