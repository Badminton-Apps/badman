import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { LevelType, SubEventTypeEnum } from '@badman/utils';
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
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './comments.step.html',
  styleUrls: ['./comments.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsStepComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);
  eventTypes = Object.values(SubEventTypeEnum);
  levelTypes = Object.values(LevelType);

  events = this.dataService.state.events;

  formGroup = input.required<FormGroup>();
  comments = computed(() => this.formGroup().get(COMMENTS) as FormGroup<CommentForm>);
  teams = computed(
    () =>
      this.formGroup().get(TEAMS) as FormGroup<{
        [key in SubEventTypeEnum]: FormArray<TeamForm>;
      }>,
  );

  validTypes = computed(() => {
    // get all comments where one team is selected
    let subeventIds: string[] = [];

    for (const type of this.eventTypes) {
      const teams = this.teams().get(type) as FormArray<TeamForm>;
      subeventIds = subeventIds.concat(teams?.value.map((team) => team.entry?.subEventId ?? ''));
    }

    console.log(subeventIds);

    // find any event where any subevent  Id is selected
    const events = this.events().filter((event) => {
      const subevents =
        event.subEventCompetitions?.filter((subevent) => subeventIds.includes(subevent.id ?? '')) ??
        [];
      return subevents.length > 0;
    });

    return events.map((event) => event.type);
  });
}
