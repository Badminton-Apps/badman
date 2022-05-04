import { Location } from 'app/_shared';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'badman-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  public calendar: CalendarDay[] = [];
  public locations: Map<number, Location> = new Map();
  public monthNames!: string[];
  public weekDayNames!: string[];

  public currentMonth?: string;
  private monthIndex: number = moment().get('month');

  ngOnInit(): void {
    this.monthNames = moment.months();
    const weekdays = moment.weekdays();
    this.weekDayNames = [weekdays[1], weekdays[2], weekdays[3], weekdays[4], weekdays[5], weekdays[6], weekdays[0]];

    this.locations.set(1, { name: 'Location A', courts: Math.floor(Math.random() * 6) + 6 });
    this.locations.set(2, { name: 'Location B', courts: Math.floor(Math.random() * 6) + 6 });

    this.generateCalendarDays(this.monthIndex);
  }

  private generateCalendarDays(monthIndex: number): void {
    // Reset calendar
    this.calendar = [];

    // Get first day of month
    const day = moment().set('month', monthIndex).startOf('month');

    // Go back untill we get to the first day of the week
    while (day.day() != 0) {
      day.subtract(1, 'day');
    }

    // Get the last day of the month
    const lastday = moment().set('month', monthIndex).endOf('month');

    // Go forward untill we get to the last day of the week
    const daysBetween = lastday.diff(day, 'days');

    // Calculate amount of weeks we need to display
    const weeks = Math.ceil(daysBetween / 7);

    // Loop through the weeks
    for (var i = 0; i < weeks * 7; i++) {
      const rand = Math.random();
      const events: { name: string; locationId: number }[] = [];
      if (rand > 0.55) {
        const locationId = Math.floor(Math.random() * this.locations.size) + 1;
        events.push({ name: 'Heren 1', locationId });
      }
      if (rand > 0.65) {
        const locationId = Math.floor(Math.random() * this.locations.size) + 1;
        events.push({ name: 'Heren 2', locationId });
      }
      if (rand > 0.95) {
        const locationId = Math.floor(Math.random() * this.locations.size) + 1;
        events.push({ name: 'Heren 3', locationId });
      }

      this.calendar.push(new CalendarDay(day.clone(), events, this.locations));

      day.add(1, 'days');
    }
  }

  public increaseMonth() {
    this.monthIndex++;
    this.generateCalendarDays(this.monthIndex);
  }

  public decreaseMonth() {
    this.monthIndex--;
    this.generateCalendarDays(this.monthIndex);
  }

  public setCurrentMonth() {
    this.monthIndex = 0;
    this.generateCalendarDays(this.monthIndex);
  }
}

export class CalendarDay {
  public date: Date;
  public isPastDate: boolean;
  public isToday: boolean;
  public remainingCourts?: number[];

  public getDateString() {
    return this.date.toISOString().split('T')[0];
  }

  constructor(
    d: moment.Moment,
    public events: { name: string; locationId: number }[],
    locations: Map<number, Location>
  ) {
    this.date = d.toDate();
    this.isPastDate = d.isBefore();
    this.isToday = d.isSame(moment(), 'day');

    const courts = new Map<number, number>();
    for (const loc of locations) {
      courts.set(loc[0], loc[1].courts!);
    }

    for (const event of events) {
      courts.set(event.locationId, courts.get(event.locationId)! - 1);
    }

    this.remainingCourts = [...courts.values()];
  }
}
