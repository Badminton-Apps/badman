import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCalendarCellClassFunction,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { RankingSystem } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import moment, { Moment } from 'moment';
import { MomentModule } from 'ngx-moment';

@Component({
  selector: 'badman-period-selection',
  templateUrl: './period-selection.component.html',
  styleUrls: ['./period-selection.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MomentModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatMenuModule,
  ],
})
export class PeriodSelectionComponent {
  @Input() period!: FormGroup;

  @Input() system!: RankingSystem;

  dateClass: MatCalendarCellClassFunction<Moment> = (cellDate, view) => {
    // Only highligh dates inside the month view.
    if (view === 'month') {
      const date = cellDate.day();

      // highlight every monday
      if (date === 1) {
        return 'point-update-date';
      }

      //
    }

    return '';
  };

  nextPeriod() {
    const endPeriod = moment(this.period?.get('end')?.value).add(
      this.system.updateIntervalAmount,
      this.system.updateIntervalUnit
    );
    const startPeriod = endPeriod
      .clone()
      .subtract(this.system.periodAmount, this.system.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.system.updateIntervalAmount,
        this.system.updateIntervalUnit
      );

    this.period?.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
    });
  }

  prevPeriod() {
    const endPeriod = moment(this.period?.get('end')?.value).subtract(
      this.system.updateIntervalAmount,
      this.system.updateIntervalUnit
    );
    const startPeriod = endPeriod
      .clone()
      .subtract(this.system.periodAmount, this.system.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.system.updateIntervalAmount,
        this.system.updateIntervalUnit
      );

    this.period?.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
    });
  }

  customPeriod(targetDate: Moment | null) {
    if (!targetDate) {
      return;
    }

    const endPeriod = moment(targetDate);
    const startPeriod = endPeriod
      .clone()
      .subtract(this.system.periodAmount, this.system.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.system.updateIntervalAmount,
        this.system.updateIntervalUnit
      );

    console.log(
      'patching',
      {
        start: startPeriod.format('YYYY-MM-DD'),
        end: endPeriod.format('YYYY-MM-DD'),
        game: gamePeriod.format('YYYY-MM-DD'),
      },
      this.system
    );

    this.period?.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
    });
  }
}
