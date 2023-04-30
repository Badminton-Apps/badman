import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { Subject } from 'rxjs';

@Component({
  selector: 'badman-comments-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,

    // Material
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './comments.step.html',
  styleUrls: ['./comments.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsStepComponent {
  destroy$ = new Subject<void>();

  @Input()
  group!: FormGroup;
}
