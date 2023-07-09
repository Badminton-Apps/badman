import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { EncounterCompetition } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { DateSelectorComponent } from '../../../../components';
import { combineLatest, of, startWith } from 'rxjs';

@Component({
  selector: 'badman-request-date',
  standalone: true,
  imports: [
    CommonModule,
    DateSelectorComponent,
    ReactiveFormsModule,
    FormsModule,

    TranslateModule,

    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './request-date.component.html',
  styleUrls: ['./request-date.component.scss'],
})
export class RequestDateComponent implements OnInit {
  @Input({ required: true })
  encounter!: EncounterCompetition;

  @Input({ required: true })
  home!: boolean;

  @Input({ required: true })
  group!: FormGroup;

  @Output()
  removeDate = new EventEmitter<void>();

  ngOnInit() {
    combineLatest([
      this.group
        .get('availabilityAway')
        ?.valueChanges.pipe(
          startWith(this.group.get('availabilityAway')?.value)
        ) ?? of(false),
      this.group
        .get('availabilityHome')
        ?.valueChanges.pipe(
          startWith(this.group.get('availabilityHome')?.value)
        ) ?? of(false),
    ]).subscribe(([availabilityAway, availabilityHome]) => {
      if (availabilityAway && availabilityHome) {
        this.group.get('selected')?.enable();
      } else {
        this.group.get('selected')?.disable();
      }
    });
  }
}
