import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SubEventCompetition } from '@badman/frontend-models';
import { LevelType } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'badman-event-competition-level-fields',
    templateUrl: './event-competition-level-fields.component.html',
    styleUrls: ['./event-competition-level-fields.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        TranslatePipe,
        MatIconModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatFormFieldModule,
        MatButtonModule,
        MatInputModule,
    ],
    
})
export class EventCompetitionLevelFieldsComponent implements OnInit {
  subEvent = input<SubEventCompetition>({} as SubEventCompetition);

  canDelete = input<boolean>(false);
  direction = input<'row' | 'column'>('row');

  type = input<LevelType>();

  formGroup = input.required<FormGroup>();

  whenDelete = output<SubEventCompetition>();

  ngOnInit(): void {
    this.formGroup()
      .get('level')
      ?.valueChanges.subscribe((r) => {
        const type =
          this.type() === LevelType.PROV
            ? 'Provinciale'
            : this.type() === LevelType.LIGA
              ? 'Liga'
              : 'Nationale';
        this.formGroup().get('name')?.setValue(`${r}e ${type}`, { emitEvent: false });
      });
  }
}
