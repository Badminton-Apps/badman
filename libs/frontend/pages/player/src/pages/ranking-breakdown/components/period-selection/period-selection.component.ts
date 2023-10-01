import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCalendarCellClassFunction,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
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
  
  @ViewChild(MatMenuTrigger) trigger?: MatMenuTrigger;

  updates: Moment[] = [];
  minDateInUpdate?: Moment;

  dateClass: MatCalendarCellClassFunction<Moment> = (cellDate, view) => {
    // Only highligh dates inside the month view.
    if (view === 'month') {
      if (cellDate.isAfter(this.system.caluclationIntervalLastUpdate)) {
        return '';
      }

      // is first monday of the month
      let isFirstMonday = cellDate.clone().set('date', 1).isoWeekday(8);

      if (isFirstMonday.date() > 7) {
        isFirstMonday = isFirstMonday.isoWeekday(-6);
      }

      if (cellDate.isSame(isFirstMonday) && cellDate.month() % 2 === 0) {
        // every first monday of a uneven month
        return 'ranking-update-date';
      }

      if (cellDate.day() == 1) {
        return 'point-update-date';
      }
    }

    return '';
  };

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

    const nextPeriod = startPeriod
      .clone()
      .add(this.system.caluclationIntervalAmount, this.system.calculationIntervalUnit);

    this.period?.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });

    this.trigger?.closeMenu();
  }
}
