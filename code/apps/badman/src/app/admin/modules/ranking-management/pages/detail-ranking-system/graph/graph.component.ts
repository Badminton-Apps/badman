import {
  Component,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';

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
  seriesData!: {
    date: Date;
    points: number[];
  }[];
}
