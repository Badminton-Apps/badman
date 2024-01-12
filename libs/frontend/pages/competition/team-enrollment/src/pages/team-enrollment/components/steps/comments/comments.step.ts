import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { Subject } from 'rxjs';
import { map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { EVENTS, COMMENTS } from '../../../../../forms';
import { LevelType, levelTypeSort } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { Comment } from '@badman/frontend-models';

type CommentForm = {
  [key in LevelType]: FormGroup<{
    comment: FormControl<string>;
    id: FormControl<string>;
  }>;
};

@Component({
  selector: 'badman-comments-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
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

  constructor(
    @Inject(Apollo) private apollo: Apollo,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(
        this.controlName
      ) as FormGroup<CommentForm>;
    }

    if (!this.control) {
      this.control = new FormGroup<CommentForm>({
        [LevelType.NATIONAL]: new FormGroup({
          comment: new FormControl(),
          id: new FormControl(),
        }),
        [LevelType.PROV]: new FormGroup({
          comment: new FormControl(),
          id: new FormControl(),
        }),
        [LevelType.LIGA]: new FormGroup({
          comment: new FormControl(),
          id: new FormControl(),
        }),
      });
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    this.group
      .get(this.eventsControlName)
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        startWith(this.group?.get(this.eventsControlName)?.value),
        switchMap((events: { name: LevelType; id: string }[]) => {
          const eventIds = events.map((event) => event.id);

          return this._loadComments(eventIds).pipe(
            map((result) =>
              events?.map((event) => ({
                ...event,
                comment: result?.find((comment) => comment.linkId === event.id)
                  ?.message,
              }))
            )
          );
        })
      )
      .subscribe((events) => {
        for (const levelType of this.levelTypes) {
          const control = this.control?.get(levelType);

          if (control) {
            const event = events?.find((event) => event.name === levelType);
            if (event) {
              control.setValue({
                comment: event.comment || '',
                id: event.id,
              });
              this.showComments[levelType] = true;
            }
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private _loadComments(eventIds: string[]) {
    return this.apollo
      .query<{ comments: Partial<Comment[]> }>({
        query: gql`
          query Comments($where: JSONObject) {
            comments(where: $where) {
              id
              linkType
              linkId
              message
            }
          }
        `,
        variables: {
          where: {
            linkType: 'competition',
            linkId: eventIds,
            clubId: this.group?.get('club')?.value,
          },
        },
      })
      .pipe(
        map((result) => (result?.data?.comments ?? []) as Partial<Comment>[])
      );
  }
}
