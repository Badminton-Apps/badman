import { Component, OnInit, ChangeDetectionStrategy, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompetitionEvent, CompetitionSubEvent } from 'app/_shared';

@Component({
  selector: 'app-event-competition-level-fields',
  templateUrl: './event-competition-level-fields.component.html',
  styleUrls: ['./event-competition-level-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCompetitionLevelFieldsComponent implements OnInit {
  @Input()
  subEvent: CompetitionSubEvent = {} as CompetitionSubEvent;

  @Input()
  formGroup: FormGroup;

  ngOnInit() {
    const idControl = new FormControl(this.subEvent.id);
    const nameControl = new FormControl(this.subEvent.name, Validators.required);
    const levelControl = new FormControl(this.subEvent.level, Validators.required);
    const levelTypeControl = new FormControl(this.subEvent.levelType, Validators.required);
    const eventTypeControl = new FormControl(this.subEvent.eventType, Validators.required);
    const maxLevelControl = new FormControl(this.subEvent.maxLevel);
    const minBaseIndexControl = new FormControl(this.subEvent.minBaseIndex);
    const maxBaseIndexControl = new FormControl(this.subEvent.maxBaseIndex);

    this.formGroup.addControl('id', idControl);
    this.formGroup.addControl('name', nameControl);
    this.formGroup.addControl('level', levelControl);
    this.formGroup.addControl('levelType', levelTypeControl);
    this.formGroup.addControl('eventType', eventTypeControl);
    this.formGroup.addControl('maxLevel', maxLevelControl);
    this.formGroup.addControl('minBaseIndex', minBaseIndexControl);
    this.formGroup.addControl('maxBaseIndex', maxBaseIndexControl);
  }

  

}
