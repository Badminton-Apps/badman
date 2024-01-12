import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Signal,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatMenuModule
],
})
export class PeriodSelectionComponent {
  @Input() period!: FormGroup<{
    start: FormControl<Moment>;
    end: FormControl<Moment>;
    game: FormControl<Moment>;
    next: FormControl<Moment>;
  }>;
  @Input() system!: Signal<RankingSystem>;

  @ViewChild(MatMenuTrigger) trigger?: MatMenuTrigger;
  minDateInUpdate?: Moment;

  viewingDate = signal(moment());

  updates = computed(() => {
    if (!this.system() || !this.viewingDate()) {
      return [];
    }

    const result = getRankingPeriods(
      this.system(),
      this.viewingDate().clone().startOf('month').subtract(1, 'day'),
      this.viewingDate().clone().endOf('month').add(1, 'day')
    );

    console.log('updates', result);
    return result;
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

  lastUpdate() {
    this.customPeriod(moment(this.system().calculationLastUpdate));
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
      .subtract(
        this.system().updateIntervalAmount,
        this.system().updateIntervalUnit,
      );

    const nextPeriod = startPeriod
      .clone()
      .add(
        this.system().calculationIntervalAmount,
        this.system().calculationIntervalUnit,
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
