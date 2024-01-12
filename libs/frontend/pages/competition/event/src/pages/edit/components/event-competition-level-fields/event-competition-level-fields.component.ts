import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SubEventCompetition } from '@badman/frontend-models';
import { LevelType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-event-competition-level-fields',
  templateUrl: './event-competition-level-fields.component.html',
  styleUrls: ['./event-competition-level-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule
],
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
