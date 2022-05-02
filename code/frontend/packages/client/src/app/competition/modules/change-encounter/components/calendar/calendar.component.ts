import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { CompetitionEncounter, compPeriod, currentCompetitionYear, Location, Team } from 'app/_shared';
import * as moment from 'moment';
import { delay, forkJoin, lastValueFrom, map } from 'rxjs';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  calendar?: CalendarDay[];
  public locations: Map<number, Location> = new Map();
  public monthNames!: string[];
  public weekDayNames!: string[];

  public currentMonth?: string;
  private encounters: CompetitionEncounter[] = [];
  private monthIndex: number = moment().get('month');
  private year: number = currentCompetitionYear();

  constructor(@Inject(MAT_DIALOG_DATA) public data: { clubId: string }, private apollo: Apollo) {}

  ngOnInit(): void {
    this.monthNames = moment.months();
    const weekdays = moment.weekdays();
    this.weekDayNames = [weekdays[1], weekdays[2], weekdays[3], weekdays[4], weekdays[5], weekdays[6], weekdays[0]];

    this._setupCalendar();
  }

  private async _setupCalendar() {
    const locations = await this._getLocations();
    const teams = await this._getTeams();
    this.encounters = await this._getEncoutners(teams);

    this.generateCalendarDays(this.monthIndex);
  }

  private async _getLocations() {
    const locations = await lastValueFrom(
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

    for (const location of locations) {
      this.locations.set(this.locations.size + 1, location);
    }
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
          })
        )
    );
  }

  private async _getEncoutners(teams: Team[]) {
    const encounters: CompetitionEncounter[] = [];

    // load teams parallel
    const teamEncounter$ = teams.map((team) => {
      return this.apollo
        .query<{
          competitionEncounters: {
            total: number;
            edges: { cursor: string; node: CompetitionEncounter }[];
          };
        }>({
          query: gql`
            query GetEncountersForTeams($team: ID!, $where: SequelizeJSON) {
              competitionEncounters(team: $team, where: $where) {
                edges {
                  node {
                    id
                    date
                    home {
                      id
                      abbreviation
                    }
                  }
                }
              }
            }
          `,
          variables: {
            team: team.id,
            where: {
              date: {
                $between: compPeriod(this.year),
              },
              homeTeamId: team.id,
            },
          },
        })
        .pipe(
          map((x) => {
            return {
              total: x.data.competitionEncounters?.total,
              encounters: x.data.competitionEncounters?.edges?.map((e) => {
                return {
                  cursor: e.cursor,
                  node: new CompetitionEncounter(e.node),
                };
              }),
            };
          })
        );
    });

    const result = await lastValueFrom(forkJoin(teamEncounter$));
    for (const e of result) {
      encounters.push(...e.encounters?.map((e) => e.node));
    }

    return encounters;
  }

  private generateCalendarDays(monthIndex: number): void {
    // Reset calendar
    const calendar: CalendarDay[] = [];

    // Get first day of month
    const day = moment().set('month', monthIndex).startOf('month');

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
    for (var i = 0; i < weeks * 7; i++) {
      // Find any encounters on day
      const dayEncounters = this.encounters
        .filter((e) => {
          return moment(e.date).isSame(day, 'day');
        })
        .map((e) => {
          return {
            name: e.home!.abbreviation!,
            locationId: 1,
          };
        });

      calendar.push(new CalendarDay(day.clone(), dayEncounters, this.locations));

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
      for (const availability of loc[1].availibilities ?? []) {
        for (const day of availability.days ?? []) {
          if (d.locale('en').format('dddd').toLocaleLowerCase() === day.day) {
            courts.set(loc[0], day.courts!);
          }
        }
      }
    }

    if (courts.size > 0) {
      for (const event of events) {
        courts.set(event.locationId, courts.get(event.locationId)! - 1);
      }

      this.remainingCourts = [...courts.values()];
    }
  }
}
