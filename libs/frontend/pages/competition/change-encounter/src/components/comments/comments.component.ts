import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticateService } from '@badman/frontend-auth';
import { Comment, EncounterCompetition } from '@badman/frontend-models';
import { signalInput, signalInputTransform } from '@badman/frontend-utils';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

@Component({
  selector: 'badman-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class CommentsComponent {
  // injects
  private userService = inject(AuthenticateService);
  private apollo = inject(Apollo);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  // signals
  user = toSignal(this.userService.user$);

  @Input({
    transform: signalInputTransform,
  })
  comments = signalInput<Comment[]>();

  @Input({ required: true })
  clubId!: string;

  @Input({ required: true })
  encounter!: EncounterCompetition;

  // forms
  commentControl = new FormControl<string>('');

  addComment() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation AddChangeEncounterComment($data: CommentNewInput!) {
            addComment(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            message: this.commentControl.value,
            linkId: this.encounter?.encounterChange?.id,
            linkType: 'encounterChange',
            clubId: this.clubId,
          },
        },
      })
      .pipe(
        take(1),
        catchError((err) => {
          console.error(err);
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this.snackBar.open(
            this.translate.instant(
              'competition.change-encounter.comment-added'
            ),
            'OK',
            {
              duration: 4000,
            }
          );
          this.commentControl.setValue('');
        }
      });
  }
}

function toBoolean(value: string | boolean): boolean {
  return value !== null && `${value}` !== 'false';
}
