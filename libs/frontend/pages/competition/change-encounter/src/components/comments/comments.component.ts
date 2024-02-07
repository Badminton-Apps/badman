import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnChanges,
  OnInit,
  Signal,
  inject,
  input,
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
import { Subject, of } from 'rxjs';
import { catchError, map, startWith, switchMap, take } from 'rxjs/operators';

const COMMENTS_QUERY = gql`
  query GetEncounterComments($where: JSONObject) {
    comments(where: $where) {
      id
      message
      player {
        id
        fullName
      }
      createdAt
    }
  }
`;

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
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class CommentsComponent implements OnInit, OnChanges {
  // injects
  private userService = inject(AuthenticateService);
  private apollo = inject(Apollo);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private injector = inject(Injector);

  // signals
  user = toSignal(this.userService.user$);
  comments!: Signal<Comment[] | undefined>;

  //
  update$ = new Subject<void>();

  // inputs
  clubId = input.required<string>();

  encounter = input.required<EncounterCompetition>();

  // forms
  commentControl = new FormControl<string>('');

  ngOnInit(): void {
    this.comments = toSignal(
      this.update$.pipe(
        startWith(null),
        switchMap(
          () =>
            this.apollo.watchQuery<{
              comments: Comment[];
            }>({
              query: COMMENTS_QUERY,
              variables: {
                where: {
                  linkId: this.encounter()?.id,
                  linkType: {
                    $or: ['home_comment_change', 'away_comment_change'],
                  },
                },
              },
            }).valueChanges,
        ),
        map((result) => result.data.comments?.map((c) => new Comment(c))?.sort(sortComments)),
      ),
      {
        injector: this.injector,
      },
    );
  }

  ngOnChanges(): void {
    this.update$.next();
  }

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
            linkId: this.encounter()?.id,
            linkType: 'encounterChange',
            clubId: this.clubId(),
          },
        },
        refetchQueries: [
          {
            query: COMMENTS_QUERY,
            variables: {
              where: {
                linkId: this.encounter()?.id,
                linkType: {
                  $or: ['home_comment_change', 'away_comment_change'],
                },
              },
            },
          },
        ],
      })
      .pipe(
        take(1),
        catchError((err) => {
          console.error(err);
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result && result.data && result.data.addComment) {
          this.snackBar.open(
            this.translate.instant('all.competition.change-encounter.comment-added'),
            'OK',
            {
              duration: 4000,
            },
          );
          this.commentControl.setValue('');
        }
      });
  }
}
