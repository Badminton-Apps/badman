import {
  CompetitionEncounter,
  compPeriod,
  currentCompetitionYear,
  Location,
  Team,
} from '../../../../../_shared';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
} from '@angular/core';
import * as moment from 'moment';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, forkJoin, tap } from 'rxjs';
import seedColor from 'seed-color';
import { v4 } from 'uuid';

@Component({
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  calendar?: CalendarDay[];
  public locations: Map<number, Location> = new Map();
  public monthNames!: string[];
  public weekDayNames!: string[];

  public currentMonth?: moment.Moment;
  private encounters: CompetitionEncounter[] = [];
  private monthIndex: number = moment().get('month');
  private year: number = currentCompetitionYear();

  private teamColors = new Map<string, string>();
  overlayOpen = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { clubId: string },
    private ref: ChangeDetectorRef,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    this.monthNames = moment.months();
    const weekdays = moment.weekdays();
    this.weekDayNames = [
      weekdays[1],
      weekdays[2],
      weekdays[3],
      weekdays[4],
      weekdays[5],
      weekdays[6],
      weekdays[0],
    ];

    this._setupCalendar();
  }

  private async _setupCalendar() {
    this.locations = await this._getLocations();
    const teams = await this._getTeams();
    this.encounters = await this._getEncoutners(teams);

    this.generateCalendarDays(this.monthIndex);

    this.ref.detectChanges();
  }

  private async _getLocations() {
    const locations: Map<number, Location> = new Map();

    const loc = await lastValueFrom(
      this.apollo
        .query<{ locations: Location[] }>({
          query: gql`
            query GetClubLocation($clubId: String!, $year: Int!) {
              locations(where: { clubId: $clubId }) {
                id
                name
                availibilities(where: { year: $year }) {
                  year
                  days {
                    courts
                    startTime
                    endTime
                    day
                  }
                }
              }
            }
          `,
          variables: {
            clubId: this.data.clubId,
            year: this.year,
          },
        })
        .pipe(
          map((result) => {
            return result.data.locations?.map((location) => {
              return new Location(location);
            });
          })
        )
    );

    for (const location of loc) {
      locations.set(this.locations.size + 1, location);
    }
    return locations;
  }

  private async _getTeams() {
    return lastValueFrom(
      this.apollo
        .query<{ teams: Team[] }>({
          query: gql`
            query GetClubTeams($clubId: String!) {
              teams(where: { clubId: $clubId }) {
                id
                name
              }
            }
          `,
          variables: {
            clubId: this.data.clubId,
          },
        })
        .pipe(
          map((result) => {
            return result.data.teams?.map((team) => {
              return new Team(team);
            });
          }),
          tap((teams) => {
            for (const team of teams) {
              this.teamColors.set(
                team?.id ?? '',
                seedColor(team?.name ?? '').toHex()
              );
            }
          })
        )
    );
  }

  private async _getEncoutners(teams: Team[], showAway = false) {
    const encounters: CompetitionEncounter[] = [];

    // load teams parallel
    const teamEncounter$ = teams.map((team) => {
      return this.apollo
        .query<{
          encounterCompetitions: {
            count: number;
            rows: Partial<CompetitionEncounter>[];
          };
        }>({
          query: gql`
            query GetEncountersForTeams($where: JSONObject) {
              encounterCompetitions(where: $where) {
                count
                rows {
                  id
                  date
                  home {
                    id
                    abbreviation
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              date: {
                $between: compPeriod(this.year),
              },
              $or: {
                homeTeamId: team.id,
                awayTeamId: showAway ? team.id : undefined,
              },
            },
          },
        })
        .pipe(
          map((x) => {
            return {
              total: x.data.encounterCompetitions?.count,
              encounters:
                x.data.encounterCompetitions?.rows?.map((e) => {
                  return new CompetitionEncounter(e);
                }) ?? [],
            };
          })
        );
    });

    const result = await lastValueFrom(forkJoin(teamEncounter$));
    for (const e of result) {
      encounters.push(...(e.encounters?.map((e) => e) ?? []));
    }

    return encounters;
  }

  private generateCalendarDays(monthIndex: number): void {
    // Reset calendar
    const calendar: CalendarDay[] = [];

    // Get first day of month
    this.currentMonth = moment().set('month', monthIndex).startOf('month');
    const day = this.currentMonth.clone();

    // Go back untill we get to the first day of the week
    while (day.day() != 1) {
      day.subtract(1, 'day');
    }

    // Get the last day of the month
    const lastday = moment().set('month', monthIndex).endOf('month');

    // Go forward untill we get to the last day of the week
    const daysBetween = lastday.diff(day, 'days');

    // Calculate amount of weeks we need to display
    const weeks = Math.ceil(daysBetween / 7);

    // Loop through the encounters
    for (let i = 0; i < weeks * 7; i++) {
      // Find any encounters on day
      const dayEncounters = this.encounters
        .filter((e) => {
          return moment(e.date).isSame(day, 'day');
        })
        .map((e) => {
          return {
            id: v4(),
            team: e.home,
            color: this.teamColors.get(e.home?.id ?? ''),
            locationId: 1,
          };
        });

      calendar.push(
        new CalendarDay(day.clone(), dayEncounters, this.locations)
      );

      day.add(1, 'days');
    }

    this.calendar = calendar;
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
    this.monthIndex = moment().month();
    this.generateCalendarDays(this.monthIndex);
  }
}

export class CalendarDay {
  public date?: Date;
  public isPastDate?: boolean;
  public isToday?: boolean;
  public remainingCourts?: number[];

  public getDateString() {
    return this.date?.toISOString().split('T')[0];
  }

  constructor(
    date?: moment.Moment,
    public events?: { id: string; team?: Team; locationId?: number; color?: string }[],
    locations?: Map<number, Location>
  ) {
    if (!date) {
      throw new Error('Date is required');
    }


    this.date = date.toDate();
    this.isPastDate = date.isBefore();
    this.isToday = date.isSame(moment(), 'day');

    const courts = new Map<number, number>();
    for (const loc of locations ?? []) {
      for (const availability of loc[1].availibilities ?? []) {
        for (const day of availability.days ?? []) {
          if (
            date.locale('en').format('dddd').toLocaleLowerCase() === day.day
          ) {
            courts.set(loc[0], day.courts ?? 0);
          }
        }
      }
    }

    if (courts.size > 0) {
      for (const event of events ?? []) {
        if (!event.locationId) {
          throw new Error('LocationId is required');
        }
        courts.set(event.locationId, (courts.get(event.locationId) ?? 0) - 2);
      }

      this.remainingCourts = [...courts.values()];
    }
  }
}
