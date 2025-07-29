
import { Component, ViewChild, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCalendarCellClassFunction, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { RankingSystem } from '@badman/frontend-models';
import { getRankingPeriods } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import moment, { Moment } from 'moment';
import { MomentModule } from 'ngx-moment';
import { RankingBreakdownService } from '../../services/ranking-breakdown.service';

@Component({
    selector: 'badman-period-selection',
    templateUrl: './period-selection.component.html',
    styleUrls: ['./period-selection.component.scss'],
    imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    MomentModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatMenuModule,
    MatDividerModule
]
})
export class PeriodSelectionComponent {
  private readonly breakdownService = inject(RankingBreakdownService);

  system = input.required<RankingSystem>();
  filter = this.breakdownService.filter;

  @ViewChild(MatMenuTrigger) trigger?: MatMenuTrigger;
  minDateInUpdate?: Moment;

  viewingDate = signal(moment());

  updates = computed(() => {
    if (!this.system() || !this.viewingDate()) {
      return [];
    }

    return getRankingPeriods(
      this.system(),
      this.viewingDate().clone().startOf('month').subtract(1, 'day'),
      this.viewingDate().clone().endOf('month').add(1, 'day'),
    );
  });

  dateClass: MatCalendarCellClassFunction<Moment> = (cellDate, view) => {
    // Only highligh dates inside the month view.
    if (view === 'month') {
      // check if the current month is the same as the viewing date, if not, update the viewing date
      if (!this.viewingDate().isSame(cellDate, 'month')) {
        this.viewingDate.set(cellDate.clone());
      }

      // find the date in the update list
      const update = this.updates().find((u) => {
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

  monthSelected(date: Moment) {
    this.viewingDate.set(date);
  }

  lastPointUpdate() {
    this.customPeriod(moment(this.system().calculationLastUpdate));
  }

  lastRankingUpdate() {
    this.customPeriod(moment(this.system().updateLastUpdate));
  }

  nextPointUpdate() {
    this.customPeriod(
      moment(this.system().calculationLastUpdate).add(
        this.system().calculationIntervalAmount,
        this.system().calculationIntervalUnit,
      ),
    );
  }

  nextRankingUpdate() {
    this.customPeriod(
      moment(this.system().updateLastUpdate).add(
        this.system().updateIntervalAmount,
        this.system().updateIntervalUnit,
      ),
    );
  }

  customPeriod(targetDate: Moment | null) {
    if (!targetDate) {
      return;
    }

    const endPeriod = moment(targetDate);
    const startPeriod = endPeriod
      .clone()
      .subtract(this.system().periodAmount, this.system().periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(this.system().updateIntervalAmount, this.system().updateIntervalUnit);

    const nextPeriod = startPeriod
      .clone()
      .add(this.system().calculationIntervalAmount, this.system().calculationIntervalUnit);

    this.filter.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });

    this.trigger?.closeMenu();
  }
}
