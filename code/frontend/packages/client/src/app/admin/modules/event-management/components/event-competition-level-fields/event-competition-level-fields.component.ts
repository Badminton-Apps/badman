import { Component, OnInit, ChangeDetectionStrategy, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompetitionEvent, CompetitionSubEvent } from 'app/_shared';

@Component({
  selector: 'app-event-competition-level-fields',
  templateUrl: './event-competition-level-fields.component.html',
  styleUrls: ['./event-competition-level-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCompetitionLevelFieldsComponent {
  @Input()
  subEvent: CompetitionSubEvent = {} as CompetitionSubEvent;

  @Input()
  formGroup: FormGroup;

}
