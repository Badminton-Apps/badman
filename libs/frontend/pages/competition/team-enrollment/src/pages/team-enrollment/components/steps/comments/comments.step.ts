import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

import { LevelType, SubEventTypeEnum } from '@badman/utils';
import { debounceTime } from 'rxjs';
import { COMMENTS, TEAMS } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { TeamForm } from '../../../team-enrollment.page';

type CommentForm = {
  [key in LevelType]: FormGroup<{
    comment: FormControl<string>;
    id: FormControl<string>;
  }>;
};

@Component({
    selector: 'badman-comments-step',
    imports: [CommonModule, TranslatePipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
    templateUrl: './comments.step.html',
    styleUrls: ['./comments.step.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsStepComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);
  eventTypes = Object.values(SubEventTypeEnum);
  levelTypes = Object.values(LevelType);

  events = this.dataService.state.events;
  comments = this.dataService.state.comments;
  club = this.dataService.state.club;

  loaded = this.dataService.state.loadedComments;

  formGroup = input.required<FormGroup>();
  commentForm = computed(() => this.formGroup().get(COMMENTS) as FormGroup<CommentForm>);
  teams = computed(
    () =>
      this.formGroup().get(TEAMS) as FormGroup<{
        [key in SubEventTypeEnum]: FormArray<TeamForm>;
      }>,
  );

  validTypes = signal<LevelType[]>([]);

  constructor() {
    // set initial controls
    effect(
      () => {
        // get club
        const club = this.club();

        // wait for locations to be loaded, and also reload when anything changes
        if (!this.loaded() || !club?.id) {
          return;
        }

        this.commentForm().reset();

        if (this.comments()) {
          for (const comment of this.comments()) {
            const event = this.events()?.find((event) => event.id === comment.linkId);
            if (!event) {
              continue;
            }

            const type = event.type as LevelType;
            const control = this.commentForm().get(type);
            if (!control) {
              continue;
            }

            control.patchValue({
              ...control.getRawValue(),
              comment: comment.message,
            });
          }
        }

        for (const type of this.levelTypes) {
          const control = this.commentForm().get(type);
          const event = this.events()?.find((event) => event.type === type);

          if (!event?.id) {
            continue;
          }

          control?.patchValue({
            ...control.getRawValue(),
            id: event.id,
          });
        }

        this.teams()
          .valueChanges.pipe(debounceTime(300))
          .subscribe(() => {
            const teams = this.teams().getRawValue();
            let subeventIds: string[] = [];

            for (const type of this.eventTypes) {
              const teamForms = teams[type];

              if (!teamForms) {
                continue;
              }

              subeventIds = subeventIds.concat(
                teamForms.map((team) => team.entry?.subEventId ?? ''),
              );
            }

            // find any event where any subevent  Id is selected
            const events = this.events().filter((event) => {
              const subevents =
                event.subEventCompetitions?.filter((subevent) =>
                  subeventIds.includes(subevent.id ?? ''),
                ) ?? [];
              return subevents.length > 0;
            });

            // distinct event.type
            this.validTypes.set(
              Array.from(new Set(events.map((event) => event.type as LevelType))),
            );
          });
      }
    );
  }
}
