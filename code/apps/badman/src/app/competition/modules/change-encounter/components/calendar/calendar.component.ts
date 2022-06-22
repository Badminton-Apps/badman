import {
  CompetitionEncounter,
  compPeriod,
  EncounterChange,
  getCompetitionYear,
  Location,
  sortTeams,
  Team,
} from '../../../../../_shared';
import {
  Component,
  OnInit,
  Inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import * as moment from 'moment';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, forkJoin, tap } from 'rxjs';
import seedColor from 'seed-color';
import { v4 } from 'uuid';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { FormControl } from '@angular/forms';

@Component({
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  manualControl: FormControl;
  calendar?: CalendarDay[];
  public locations: Map<number, Location> = new Map();
  public monthNames!: string[];
  public weekDayNames!: string[];

  private encounters: CompetitionEncounter[] = [];
  public teams: Team[] = [];
  public visibleTeams?: string[];
  public firstDayOfMonth: moment.Moment;
  private year: number;

  private teamColors = new Map<string, string>();
  overlayOpen = '';

  constructor(
    private dialogRef: MatDialogRef<CalendarComponent>,
    private ref: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      clubId: string;
      date?: Date;
      allowManualEntry?: boolean;
    },
    private apollo: Apollo
  ) {
    this.manualControl = new FormControl(data?.date);
    this.manualControl.valueChanges.subscribe((date) => {
      this.selectDay(date);
    });
    this.firstDayOfMonth = moment(data.date);
    if (!this.firstDayOfMonth.isValid()) {
      this.firstDayOfMonth = moment();
    }
    this.firstDayOfMonth.startOf('month');
    this.year = getCompetitionYear(this.firstDayOfMonth);
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
  }

  ngOnInit(): void {
    this._setupCalendar();
  }

  private async _setupCalendar() {
    this.locations = await this._getLocations();
    this.teams = await this._getTeams();
    this.encounters = await this._getEncoutners();
    this.generateCalendarDays();
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
                  exceptions {
                    start
                    end
                    courts
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
              teams(where: { clubId: $clubId, active: true }) {
                id
                name
                type
                teamNumber
              }
            }
          `,
          variables: {
            clubId: this.data.clubId,
          },
        })
        .pipe(
          map((result) => {
            return result.data.teams?.map((team) => new Team(team));
          }),
          map((teams) => teams.sort(sortTeams)),
          tap((teams) => {
            const visibleTeams = localStorage
              .getItem(`visible_teams_${this.data.clubId}`)
              ?.split(',');
            this.visibleTeams = teams
              ?.filter((team) => {
                if (visibleTeams && visibleTeams.length > 0 && team.id) {
                  return visibleTeams.includes(team.id);
                }
                return true;
              })
              ?.map((team) => {
                if (!team.id) {
                  throw new Error('Team has no id');
                }

                return team.id;
              });
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

  private async _getEncoutners(showAway = false) {
    const encounters: CompetitionEncounter[] = [];

    // load teams parallel
    const teamEncounter$ = this.teams.map((team) => {
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
                  encounterChange {
                    accepted
                    dates {
                      date
                    }
                  }
                  home {
                    id
                    name
                  }
                  away {
                    id
                    name
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

  private generateCalendarDays(): void {
    // Reset calendar
    const calendar: CalendarDay[] = [];

    // Get first day of month
    const day = this.firstDayOfMonth.clone();

    // Go back untill we get to the first day of the week
    while (day.day() != 1) {
      day.subtract(1, 'day');
    }

    // Get the last day of the month
    const lastday = this.firstDayOfMonth.clone().endOf('month');

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
            encounter: e,
            color: this.teamColors.get(e.home?.id ?? ''),
            startTime: moment(e.date).format('HH:mm'),
            locationId: 1,
          };
        });

      // const changedEncounters = this.encounters
      //   .map(e => e.encounterChange);
      //   .filter((e) => {
      //     e.dates.forEach((d) => {
      //     return moment().isSame(day, 'day');
      //   })
      //   .map((e) => {
      //     return {
      //       id: v4(),
      //       encounter: e,
      //       color: this.teamColors.get(e.home?.id ?? ''),
      //       startTime: moment(e.date).format('HH:mm'),
      //       locationId: 1,
      //     };
      //   });

      calendar.push(
        new CalendarDay(
          day.clone(),
          dayEncounters,
          this.locations,
          this.visibleTeams
        )
      );

      day.add(1, 'days');
    }

    this.calendar = calendar;
    this.ref.detectChanges();
  }

  public increaseMonth() {
    this.firstDayOfMonth.add(1, 'month');
    this.generateCalendarDays();
  }

  public decreaseMonth() {
    this.firstDayOfMonth.subtract(1, 'month');
    this.generateCalendarDays();
  }

  public setCurrentMonth() {
    this.firstDayOfMonth.set('month', moment().get('month'));
    this.generateCalendarDays();
  }

  public changeVisibleTeams(event: MatCheckboxChange, teamId?: string) {
    if (!teamId) {
      return;
    }

    if (event.checked) {
      this.visibleTeams?.push(teamId);
    } else {
      this.visibleTeams = this.visibleTeams?.filter((t) => t !== teamId);
    }

    localStorage.setItem(
      `visible_teams_${this.data.clubId}`,
      this.visibleTeams?.join(',') ?? ''
    );
    this.generateCalendarDays();
  }

  public showAllTeams() {
    this.visibleTeams = this.teams.map((t) => {
      if (!t.id) {
        throw new Error('Team has no id');
      }
      return t.id;
    });
    localStorage.setItem(
      `visible_teams_${this.data.clubId}`,
      this.visibleTeams?.join(',')
    );
    this.generateCalendarDays();
  }

  public hideAllTeams() {
    this.visibleTeams = [];
    this.generateCalendarDays();
  }

  public selectDay(date?: Date) {
    this.dialogRef.close(date);
  }
}

export class CalendarDay {
  public date?: Date;
  public isPastDate?: boolean;
  public isToday?: boolean;
  public remainingCourts?: Map<number, number>;
  public totalCourts?: Map<number, number>;
  public locations?: {
    id: number;
    name?: string;
    availibility: {
      startTime?: string;
      totalCourts: number;
      remainingEncounters: number;
      events: {
        id: string;
        encounter: CompetitionEncounter;
        color?: string;
        removed: boolean;
      }[];
    }[];
  }[];

  public getDateString() {
    return this.date?.toISOString().split('T')[0];
  }

  constructor(
    date?: moment.Moment,
    events?: {
      id: string;
      encounter: CompetitionEncounter;
      locationId?: number;
      startTime?: string;
      color?: string;
    }[],
    locations?: Map<number, Location>,
    private visibleTeams?: string[]
  ) {
    if (!date) {
      throw new Error('Date is required');
    }
    this.locations = [];

    this.date = date.toDate();
    this.isPastDate = date.isBefore();
    this.isToday = date.isSame(moment(), 'day');

    for (const loc of locations ?? []) {
      for (const availability of loc[1].availibilities ?? []) {
        const availibilityDays = availability.days.filter(
          (day) =>
            date.locale('en').format('dddd').toLocaleLowerCase() === day.day
        );

        const av =
          availibilityDays.map((day) => {
            day.courts =
              availability.exceptions.find((exception) =>
                date.isBetween(exception.start, exception.end, 'day', '[]')
              )?.courts ?? day.courts;

            // use 2 courts for each encounter, if uneven skip last court
            let courts = day.courts ?? 0;

            if (courts % 2 != 0) {
              courts--;
            }
            return {
              startTime: day.startTime,
              totalCourts: day.courts ?? 0,
              remainingEncounters: courts / 2,
              events: [],
            };
          }) ?? [];

        this.locations.push({
          id: loc[0],
          name: loc[1].name,
          availibility: av,
        });
      }
    }

    for (const event of events ?? []) {
      if (!event.locationId) {
        throw new Error('LocationId is required');
      }
      this.addEvent(event);
    }
  }

  private addEvent(event) {
    if (!this.locations) {
      return;
    }

    const locationIndex = this.locations.findIndex(
      (l) => l.id === event.locationId
    );

    const removed = !!event.encounter?.encounterChange;

    // Update the location availibility
    if (locationIndex >= 0) {
      const availibilityIndex = this.locations[
        locationIndex
      ].availibility?.findIndex((a) => a.startTime === event.startTime);

      if (availibilityIndex >= 0) {
        if (!removed) {
          this.locations[locationIndex].availibility[availibilityIndex]
            .remainingEncounters--;
        }

        if (
          this.locations[locationIndex].availibility[availibilityIndex]
            .remainingEncounters < 0
        ) {
          this.locations[locationIndex].availibility[
            availibilityIndex
          ].remainingEncounters = 0;
        }
        if (this.visibleTeams?.includes(event.encounter?.home?.id)) {
          this.locations[locationIndex].availibility[
            availibilityIndex
          ].events?.push({
            ...event,
            removed,
          });
        }
      } else {
        if (this.visibleTeams?.includes(event.encounter?.home?.id)) {
          return;
        }
        // We have no availibility for this time
        this.locations[locationIndex]?.availibility?.push({
          startTime: event.startTime,
          totalCourts: 0,
          remainingEncounters: 0,
          events: [
            {
              ...event,
              removed,
            },
          ],
        });
      }
    }
  }
}
