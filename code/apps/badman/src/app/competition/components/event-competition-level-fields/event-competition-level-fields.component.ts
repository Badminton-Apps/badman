import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompetitionEvent, CompetitionSubEvent, LevelType } from 'app/_shared';

@Component({
  selector: 'badman-event-competition-level-fields',
  templateUrl: './event-competition-level-fields.component.html',
  styleUrls: ['./event-competition-level-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCompetitionLevelFieldsComponent implements OnInit {
  @Input()
  subEvent: CompetitionSubEvent = {} as CompetitionSubEvent;

  @Input()
  type?: LevelType;

  @Input()
  formGroup!: FormGroup;

  @Output()
  onDelete = new EventEmitter<CompetitionSubEvent>();

  ngOnInit(): void {
    this.formGroup.get('level')!.valueChanges.subscribe((r) => {
      const type = this.type === LevelType.PROV ? 'Provinciale' : this.type === LevelType.LIGA ? 'Liga' : 'Nationale';
      this.formGroup.get('name')!.setValue(`${r}e ${type}`, { emitEvent: false });
    });
  }
}
