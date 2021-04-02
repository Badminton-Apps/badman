import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';

@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphsComponent {
  @Input()
  levels: number[];

  @Input()
  seriesData;
}
