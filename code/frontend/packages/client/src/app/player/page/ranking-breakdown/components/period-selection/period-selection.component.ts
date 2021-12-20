import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-period-selection',
  templateUrl: './period-selection.component.html',
  styleUrls: ['./period-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectionComponent {
  @Input() formGroup!: FormGroup;

  @Output()
  onNext = new EventEmitter<void>();
  @Output()
  onPrev = new EventEmitter<void>();
}
