import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamComponent } from '../team';
import { FormControl, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EventEntry, SubEventCompetition, Team } from '@badman/frontend-models';
import { SubEventType, SubEventTypeEnum } from '@badman/utils';

@Component({
  selector: 'badman-team-enrollment',
  standalone: true,
  imports: [
    CommonModule,

    // Material
    MatFormFieldModule,
    MatSelectModule,

    // Own
    TeamComponent,
  ],
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent {
  @Input()
  group!: FormGroup;

  @Input()
  team!: FormControl<Team>;

  @Input()
  entry!: FormControl<EventEntry>;

  @Input()
  subEvents!: {
    [key in SubEventType]: SubEventCompetition[];
  };

  @Input()
  type!: SubEventTypeEnum;

  @Output()
  removeTeam = new EventEmitter<Team>();

  @Output()
  changeTeamNumber = new EventEmitter<Team>();

  
}
