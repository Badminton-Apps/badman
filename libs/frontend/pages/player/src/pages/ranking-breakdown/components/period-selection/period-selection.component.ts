import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';

@Component({
  selector: 'badman-period-selection',
  templateUrl: './period-selection.component.html',
  styleUrls: ['./period-selection.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MomentModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
})
export class PeriodSelectionComponent {
  @Input() formGroup!: FormGroup;

  @Output()
  whenNext = new EventEmitter<void>();
  @Output()
  whenPrev = new EventEmitter<void>();
}
