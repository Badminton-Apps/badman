import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { EVENTS, COMMENTS } from '../../../../../forms';
import { LevelType, levelTypeSort } from '@badman/utils';

type CommentForm = {
  [key in LevelType]: FormControl<string | undefined>;
};

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
export class CommentsStepComponent implements OnInit {
  destroy$ = new Subject<void>();

  levelTypes = Object.values(LevelType).sort(levelTypeSort);

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<CommentForm>;

  @Input()
  controlName = COMMENTS;

  @Input()
  eventsControlName = EVENTS;

  showComments: {
    [key in LevelType]: boolean;
  } = {
    PROV: false,
    LIGA: false,
    NATIONAL: false,
  };

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(
        this.controlName
      ) as FormGroup<CommentForm>;
    }

    if (!this.control) {
      this.control = new FormGroup<CommentForm>({
        [LevelType.NATIONAL]: new FormControl(),
        [LevelType.PROV]: new FormControl(),
        [LevelType.LIGA]: new FormControl(),
      });
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    this.group
      .get(this.eventsControlName)
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        startWith(this.group?.get(this.eventsControlName)?.value)
      )
      .subscribe((events: { name: LevelType; id: string }[]) => {
        this.showComments = {
          [LevelType.NATIONAL]: events?.some(
            (event) => event.name === LevelType.NATIONAL
          ),
          [LevelType.PROV]: events?.some(
            (event) => event.name === LevelType.PROV
          ),
          [LevelType.LIGA]: events?.some(
            (event) => event.name === LevelType.LIGA
          ),
        };
      });
  }
}
