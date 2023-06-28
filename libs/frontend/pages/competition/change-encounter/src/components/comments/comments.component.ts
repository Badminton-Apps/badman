import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticateService } from '@badman/frontend-auth';
import { Comment, EncounterCompetition } from '@badman/frontend-models';
import { sortComments } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

@Component({
  selector: 'badman-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MomentModule,
    FormsModule,
    TranslateModule,

    // Material
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class CommentsComponent {
  // injects
  private userService = inject(AuthenticateService);
  private apollo = inject(Apollo);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  // signals
  user = toSignal(this.userService.user$);

  @Input()
  comments = signal<Comment[]>([]);

  @Input({ required: true })
  clubId!: string;

  @Input({ required: true })
  encounter!: EncounterCompetition;

  // forms
  commentControl = new FormControl<string>('');

  addComment() {
    this.apollo
      .mutate<{
        addComment: Partial<Comment>;
      }>({
        mutation: gql`
          mutation AddChangeEncounterComment($data: CommentNewInput!) {
            addComment(data: $data) {
              id
              message
              player {
                id
                fullName
              }
              createdAt
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
        if (result && result.data && result.data.addComment) {
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
          this.comments.set(
            [...this.comments(), result.data.addComment].sort(sortComments)
          );
        }
      });
  }
}
