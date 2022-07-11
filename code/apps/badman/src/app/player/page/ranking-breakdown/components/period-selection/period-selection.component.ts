import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'badman-period-selection',
  templateUrl: './period-selection.component.html',
  styleUrls: ['./period-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectionComponent {
  @Input() formGroup!: FormGroup;

  @Output()
  whenNext = new EventEmitter<void>();
  @Output()
  whenPrev = new EventEmitter<void>();
}
