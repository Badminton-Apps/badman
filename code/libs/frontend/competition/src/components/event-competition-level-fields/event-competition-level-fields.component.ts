import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { SubEventCompetition, LevelType } from '@badman/frontend/models';

@Component({
  selector: 'badman-event-competition-level-fields',
  templateUrl: './event-competition-level-fields.component.html',
  styleUrls: ['./event-competition-level-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCompetitionLevelFieldsComponent implements OnInit {
  @Input()
  subEvent: SubEventCompetition = {} as SubEventCompetition;

  @Input()
  type?: LevelType;

  @Input()
  formGroup!: FormGroup;

  @Output()
  whenDelete = new EventEmitter<SubEventCompetition>();

  ngOnInit(): void {
    this.formGroup.get('level')?.valueChanges.subscribe((r) => {
      const type =
        this.type === LevelType.PROV
          ? 'Provinciale'
          : this.type === LevelType.LIGA
          ? 'Liga'
          : 'Nationale';
      this.formGroup
        .get('name')
        ?.setValue(`${r}e ${type}`, { emitEvent: false });
    });
  }
}
