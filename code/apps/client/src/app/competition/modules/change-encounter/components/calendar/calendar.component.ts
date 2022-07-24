import {
  CompetitionEncounter,
  compPeriod,
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
import moment from 'moment';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, forkJoin } from 'rxjs';
import { randomLightColor } from 'seed-to-color';
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

  private homeEncounters: CompetitionEncounter[] = [];
  private awayEncounters: CompetitionEncounter[] = [];
  public homeTeams: Team[] = [];
  public awayTeams: Team[] = [];
  public visibleTeamsOwn?: string[];
  public visibleTeamsOther?: string[];
  public firstDayOfMonth: moment.Moment;
  private year: number;

  private teamColors = new Map<string, string>();

  public gridTemplateColumns = '';

  constructor(
    public dialogRef: MatDialogRef<CalendarComponent>,
    private ref: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      homeClubId: string;
      awayClubId: string;
      date?: Date;
      home?: boolean;
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
    this.homeTeams = await this._getTeams(this.data.homeClubId);
    this.awayTeams = await this._getTeams(this.data.awayClubId);

    this.setColors(this.homeTeams);

    this.homeEncounters = await this._getEncoutners(
      this.homeTeams?.map((t) => t.id)
    );
    this.awayEncounters = await this._getEncoutners(
      this.awayTeams?.map((t) => t.id)
    );

    this.setColors([...this.homeTeams, ...this.awayTeams]);
    this.showVisible([...this.homeTeams, ...this.awayTeams]);

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
            clubId: this.data.homeClubId,
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

  private async _getTeams(clubid: string) {
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
            clubId: clubid,
          },
        })
        .pipe(
          map((result) => {
            return result.data.teams?.map((team) => new Team(team));
          }),
          map((teams) => teams.sort(sortTeams))
        )
    );
  }

  private async _getEncoutners(
    teamIds?: (string | undefined)[],
    showAway = false
  ) {
    const encounters: CompetitionEncounter[] = [];

    // load teams parallel
    const teamEncounter$ = teamIds?.map((team) => {
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
                    teamNumber
                    type
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
                homeTeamId: team,
                awayTeamId: showAway ? team : undefined,
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

    if (teamEncounter$) {
      const result = await lastValueFrom(forkJoin(teamEncounter$));
      for (const e of result) {
        encounters.push(...(e.encounters?.map((e) => e) ?? []));
      }
    }

    return encounters;
  }

  private setColors(teams: Team[]) {
    for (const team of teams) {
      this.teamColors.set(
        team?.id ?? '',
        `#${randomLightColor(team?.name ?? '')}`
      );
    }
  }

  private showVisible(teams: Team[]) {
    const visibleTeamsOwn = localStorage
      .getItem(`visible_teams_${this.data.homeClubId}`)
      ?.split(',');
    this.visibleTeamsOwn = teams
      ?.filter((team) => {
        if (visibleTeamsOwn && visibleTeamsOwn.length > 0 && team.id) {
          return visibleTeamsOwn.includes(team.id);
        }
        return this.data.home;
      })
      ?.map((team) => {
        if (!team.id) {
          throw new Error('Team has no id');
        }

        return team.id;
      });

    const visibleTeamsOther = localStorage
      .getItem(`visible_teams_${this.data.homeClubId}`)
      ?.split(',');
    this.visibleTeamsOther = teams
      ?.filter((team) => {
        if (visibleTeamsOther && visibleTeamsOther.length > 0 && team.id) {
          return visibleTeamsOther.includes(team.id);
        }
        return !this.data.home;
      })
      ?.map((team) => {
        if (!team.id) {
          throw new Error('Team has no id');
        }

        return team.id;
      });
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

    const eventsOnDay = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
    };

    // Loop through the encounters
    for (let i = 0; i < weeks * 7; i++) {
      // Find any encounters on day
      const homeEnc = this.homeEncounters
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
            requested: false,
            removed: !!e.encounterChange,
          };
        });

      // Find any encounters requestd for day
      this.homeEncounters
        ?.map((e) => {
          return e.encounterChange?.dates?.map((d) => {
            return {
              id: v4(),
              ...e,
              date: d.date,
            } as CompetitionEncounter;
          });
        })
        ?.flat()
        ?.filter((e) => {
          return moment(e?.date).isSame(day, 'day');
        })
        ?.map((e) => {
          if (!e) {
            return;
          }
          homeEnc.push({
            id: v4(),
            encounter: {
              ...e,
              encounterChange: undefined,
            },
            color: this.teamColors.get(e.home?.id ?? '') ?? '',
            startTime: moment(e.date).format('HH:mm'),
            locationId: 1,
            requested: true,
            removed: false,
          });
        });

      // Find any encounters on day
      const awayEnc = this.awayEncounters
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
            requested: false,
            removed: !!e.encounterChange,
          };
        });

      this.awayEncounters
        ?.map((e) => {
          return e.encounterChange?.dates?.map((d) => {
            return {
              id: v4(),
              ...e,
              date: d.date,
            } as CompetitionEncounter;
          });
        })
        ?.flat()
        ?.filter((e) => {
          return moment(e?.date).isSame(day, 'day');
        })
        ?.map((e) => {
          if (!e) {
            return;
          }
          awayEnc.push({
            id: v4(),
            encounter: {
              ...e,
              encounterChange: undefined,
            },
            color: this.teamColors.get(e.home?.id ?? '') ?? '',
            startTime: moment(e.date).format('HH:mm'),
            locationId: 1,
            requested: true,
            removed: false,
          });
        });

      console.log(this.homeEncounters, this.awayEncounters);

      calendar.push(
        new CalendarDay(day.clone(), homeEnc, awayEnc, this.locations, [
          ...(this.visibleTeamsOther ?? []),
          ...(this.visibleTeamsOwn ?? []),
        ])
      );

      eventsOnDay[day.isoWeekday()] += homeEnc.length + awayEnc.length;

      day.add(1, 'days');
    }

    this.gridTemplateColumns = this._genGridTemplateColumns(eventsOnDay);

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

  public changeVisibleTeams(
    event: MatCheckboxChange,
    teamId?: string,
    own?: boolean
  ) {
    if (!teamId) {
      return;
    }

    if (own) {
      if (event.checked) {
        this.visibleTeamsOwn?.push(teamId);
      } else {
        this.visibleTeamsOwn?.splice(this.visibleTeamsOwn?.indexOf(teamId), 1);
      }

      localStorage.setItem(
        `visible_teams_${this.data.homeClubId}`,
        this.visibleTeamsOwn?.join(',') ?? ''
      );
    } else {
      if (event.checked) {
        this.visibleTeamsOther?.push(teamId);
      } else {
        this.visibleTeamsOther?.splice(
          this.visibleTeamsOther?.indexOf(teamId),
          1
        );
      }

      localStorage.setItem(
        `visible_teams_${this.data.homeClubId}`,
        this.visibleTeamsOther?.join(',') ?? ''
      );
    }

    this.generateCalendarDays();
  }

  public showAllTeams(teams: Team[], clubId: string) {
    this.visibleTeamsOther = teams.map((t) => {
      if (!t.id) {
        throw new Error('Team has no id');
      }
      return t.id;
    });
    localStorage.setItem(
      `visible_teams_${clubId}`,
      this.visibleTeamsOther?.join(',')
    );
    this.generateCalendarDays();
  }

  public hideAllTeams(clubId: string) {
    this.visibleTeamsOther = [];
    localStorage.setItem(
      `visible_teams_${clubId}`,
      this.visibleTeamsOther?.join(',')
    );
    this.generateCalendarDays();
  }

  public selectDay(date?: Date) {
    this.dialogRef.close(date);
  }

  private _genGridTemplateColumns(eventsOnDay: { [key: string]: number }) {
    // Devide occuping space for each day
    const gridTemplate: string[] = [];

    for (const day of [...Array(7).keys()]) {
      if (eventsOnDay[day + 1] > 0) {
        gridTemplate.push(`1fr`);
      } else {
        gridTemplate.push(`0.60fr`);
      }
    }

    return gridTemplate.join(' ');
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
      option: number;
      events: {
        id: string;
        encounter: CompetitionEncounter;
        color?: string;
        removed: boolean;
        requested: boolean;
      }[];
    }[];
  }[];

  public getDateString() {
    return this.date?.toISOString().split('T')[0];
  }

  constructor(
    date?: moment.Moment,
    homeEvents?: (
      | {
          id: string;
          encounter: CompetitionEncounter;
          locationId?: number;
          startTime?: string;
          color?: string;
          requested: boolean;
        }
      | undefined
    )[],
    awayEvents?: (
      | {
          id: string;
          encounter: CompetitionEncounter;
          locationId?: number;
          startTime?: string;
          color?: string;
          requested: boolean;
        }
      | undefined
    )[],
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
            let courts =
              availability.exceptions.find((exception) =>
                date.isBetween(exception.start, exception.end, 'day', '[]')
              )?.courts ??
              day.courts ??
              0;

            // use 2 courts for each encounter, if uneven skip last court
            if (courts % 2 != 0) {
              courts--;
            }
            return {
              startTime: day.startTime,
              totalCourts: day.courts ?? 0,
              remainingEncounters: courts / 2,
              option: 0,
              events: [],
            };
          }) ?? [];

        av.sort((a, b) => {
          return a.startTime?.localeCompare(b.startTime ?? '') ?? 0;
        });

        this.locations.push({
          id: loc[0],
          name: loc[1].name,
          availibility: av,
        });
      }
    }

    for (const event of homeEvents ?? []) {
      if (!event?.locationId) {
        throw new Error('LocationId is required');
      }
      this.addEvent(event, true);
    }
    for (const event of awayEvents ?? []) {
      if (!event?.locationId) {
        throw new Error('LocationId is required');
      }
      this.addEvent(event, false);
    }
  }

  private addEvent(event, countsForLocation?: boolean) {
    if (!this.locations) {
      return;
    }

    const locationIndex = this.locations.findIndex(
      (l) => l.id === event.locationId
    );

    const skipRemaining = !!event.encounter?.encounterChange || event.requested;

    // Update the location availibility
    if (locationIndex >= 0) {
      const availibilityIndex = this.locations[
        locationIndex
      ].availibility?.findIndex((a) => a.startTime === event.startTime);

      if (availibilityIndex >= 0 && countsForLocation) {
        if (!skipRemaining) {
          this.locations[locationIndex].availibility[availibilityIndex]
            .remainingEncounters--;
        } else if (event.requested) {
          this.locations[locationIndex].availibility[availibilityIndex]
            .option++;
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
            skipRemaining,
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
          option: 0,
          events: [
            {
              ...event,
              skipRemaining,
            },
          ],
        });
      }
    }
  }
}
