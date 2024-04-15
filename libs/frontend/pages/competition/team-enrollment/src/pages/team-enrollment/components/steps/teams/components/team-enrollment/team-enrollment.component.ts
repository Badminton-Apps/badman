import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, input } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EnrollmentMessageComponent } from '@badman/frontend-components';
import {
  EntryCompetitionPlayer,
  RankingSystem,
  SubEventCompetition,
  Team,
  TeamValidationResult,
} from '@badman/frontend-models';
import { SubEventType, SubEventTypeEnum } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { TeamComponent } from '../team';

@Component({
  selector: 'badman-team-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,
    TeamComponent,
    EnrollmentMessageComponent,
    TranslateModule,
  ],
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  group = input.required<FormGroup>();

  season = input.required<number>();
  system = input.required<RankingSystem>();

  subEvents = input.required<{
    [key in SubEventType]: SubEventCompetition[];
  }>();

  type = input.required<SubEventTypeEnum>();

  validation = input<TeamValidationResult>();


  subEventsForTeam = computed(() => {
    if (!this.team) return [];

    const availibleSubs = this.subEvents()[this.type()];
    const validation = this.validation();

    if (!availibleSubs) return [];


    return availibleSubs.filter((sub) => {
      return (sub.minBaseIndex ?? 0) <= (validation?.baseIndex ?? 0)
    });

    
    return ;
  });

  @Output()
  removeTeam = new EventEmitter<Team>();

  @Output()
  changeTeamNumber = new EventEmitter<Team>();

  team!: FormControl<Team>;
  subEvent!: FormControl<string>;
  players!: FormArray<FormControl<EntryCompetitionPlayer>>;

  ngOnInit(): void {
    this.team = this.group().get('team') as FormControl<Team>;

    const entry = this.group().get('entry');

    this.subEvent = entry?.get('subEventId') as FormControl<string>;
    this.players = entry?.get('players') as FormArray<FormControl<EntryCompetitionPlayer>>;

    if (this.team?.value.link) {
      this.subEvent?.disable();
    }
  }
}
