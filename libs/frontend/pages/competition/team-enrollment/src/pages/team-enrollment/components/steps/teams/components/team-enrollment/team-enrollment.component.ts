import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  EntryCompetitionPlayer,
  SubEventCompetition,
  Team,
  TeamValidationResult,
} from '@badman/frontend-models';
import { SubEventType, SubEventTypeEnum } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { TeamComponent } from '../team';
import { EnrollmentMessageComponent } from '@badman/frontend-components';

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
    TranslateModule
],
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  @Input()
  group!: FormGroup;

  @Input()
  season!: number;

  @Input()
  subEvents!: {
    [key in SubEventType]: SubEventCompetition[];
  };

  @Input()
  type!: SubEventTypeEnum;

  @Input()
  validation?: TeamValidationResult;

  @Output()
  removeTeam = new EventEmitter<Team>();

  @Output()
  changeTeamNumber = new EventEmitter<Team>();

  team!: FormControl<Team>;
  subEvent!: FormControl<string>;
  players!: FormArray<FormControl<EntryCompetitionPlayer>>;

  ngOnInit(): void {
    this.team = this.group.get('team') as FormControl<Team>;

    const entry = this.group.get('entry');

    this.subEvent = entry?.get('subEventId') as FormControl<string>;
    this.players = entry?.get('players') as FormArray<
      FormControl<EntryCompetitionPlayer>
    >;
  }
}
