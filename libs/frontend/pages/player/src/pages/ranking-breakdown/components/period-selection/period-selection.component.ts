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
import { getRankingPeriods } from '@badman/utils';
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

  minDateInUpdate?: Moment;

  dateClass: MatCalendarCellClassFunction<Moment> = (cellDate, view) => {
    // Only highligh dates inside the month view.
    if (view === 'month') {
      const updates = getRankingPeriods(this.system, cellDate, cellDate);

      // find the date in the update list
      const update = updates.find((u) => {
        return moment(u.date).isSame(cellDate, 'day');
      });

      if (update) {
        if (update.updatePossible) {
          return 'ranking-update-date';
        } else {
          return 'point-update-date';
        }
      }
    }

    return '';
  };

  lastUpdate() {
    this.customPeriod(moment(this.system.calculationIntervalLastUpdate));
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
        this.system.updateIntervalUnit,
      );

    const nextPeriod = startPeriod
      .clone()
      .add(
        this.system.calculationIntervalAmount,
        this.system.calculationIntervalUnit,
      );

    this.period?.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });

    this.trigger?.closeMenu();
  }
}
