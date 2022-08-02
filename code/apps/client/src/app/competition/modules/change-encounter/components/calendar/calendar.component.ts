import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { forkJoin, lastValueFrom, map } from 'rxjs';
import { randomLightColor } from 'seed-to-color';
import { v4 } from 'uuid';
import {
  CompetitionEncounter,
  compPeriod,
  getCompetitionYear,
  Location,
  sortTeams,
  Team,
} from '../../../../../_shared';

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

  public visibleTeams?: {
    [key: string]: string[];
  };

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
      awayTeamId: string;
      homeTeamId: string;
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
        .query<{ club: { locations: Location[] } }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetClubLocation($clubId: ID!, $year: Int!) {
              club(id: $clubId) {
                id
                locations {
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
            }
          `,
          variables: {
            clubId: this.data.homeClubId,
            year: this.year,
          },
        })
        .pipe(
          map((result) => {
            return result.data?.club?.locations?.map((location) => {
              return new Location(location);
            });
          })
        )
    );

    let index = 0;
    for (const location of loc) {
      locations.set(++index, location);
    }

    return locations;
  }

  private async _getTeams(clubid: string) {
    return lastValueFrom(
      this.apollo
        .query<{ club: { teams: Team[] } }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetClubTeams($clubId: ID!) {
              club(id: $clubId) {
                id
                teams(where: { active: true }) {
                  id
                  name
                  type
                  teamNumber
                }
              }
            }
          `,
          variables: {
            clubId: clubid,
          },
        })
        .pipe(
          map((result) => {
            return result.data?.club.teams?.map((team) => new Team(team));
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
          fetchPolicy: 'cache-first',
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
    const homeTeamsStorage = localStorage
      .getItem(`visible_teams_${this.data.homeClubId}`)
      ?.split(',');

    const homeTeams = teams
      ?.filter((team) => {
        if (homeTeamsStorage && homeTeamsStorage.length > 0 && team.id) {
          return homeTeamsStorage.includes(team.id);
        }
        // Show own team by default
        return team.id === this.data.homeTeamId;
      })
      ?.map((team) => {
        if (!team.id) {
          throw new Error('Team has no id');
        }

        return team.id;
      });

    const awayTeamsStorage = localStorage
      .getItem(`visible_teams_${this.data.awayClubId}`)
      ?.split(',');
    const awayTeams = teams
      ?.filter((team) => {
        if (awayTeamsStorage && awayTeamsStorage.length > 0 && team.id) {
          return awayTeamsStorage.includes(team.id);
        }

        // Show own team by default
        return team.id === this.data.awayTeamId;
      })
      ?.map((team) => {
        if (!team.id) {
          throw new Error('Team has no id');
        }

        return team.id;
      });

    this.visibleTeams = {
      [this.data.homeClubId]: homeTeams,
      [this.data.awayClubId]: awayTeams,
    };
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

    const hasActivityOnDay = {
      '1': false,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
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
            ownTeam: this.data.home,
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
            ownTeam: this.data.home,
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
            ownTeam: !this.data.home,
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
            ownTeam: !this.data.home,
          });
        });

      const calDay = new CalendarDay(
        day.clone(),
        homeEnc,
        awayEnc,
        this.locations,
        [
          ...(this.visibleTeams?.[this.data.homeClubId] ?? []),
          ...(this.visibleTeams?.[this.data.awayClubId] ?? []),
        ]
      );
      calendar.push(calDay);

      hasActivityOnDay[day.isoWeekday()] =
        hasActivityOnDay[day.isoWeekday()] || calDay.hasSomeActivity;

      day.add(1, 'days');
    }

    this.gridTemplateColumns = this._genGridTemplateColumns(hasActivityOnDay);

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
    teamId: string,
    clubId: string
  ) {
    if (!teamId) {
      return;
    }
    if (!this.visibleTeams?.[clubId]) {
      return;
    }

    if (event.checked) {
      this.visibleTeams?.[clubId].push(teamId);
    } else {
      this.visibleTeams?.[clubId].splice(
        this.visibleTeams?.[clubId].indexOf(teamId),
        1
      );
    }

    localStorage.setItem(
      `visible_teams_${clubId}`,
      this.visibleTeams?.[clubId]?.join(',') ?? ''
    );

    this.generateCalendarDays();
  }

  public showAllTeams(teams: Team[], clubId: string) {
    if (!this.visibleTeams?.[clubId]) {
      throw new Error('Club not found');
    }

    this.visibleTeams[clubId] = teams.map((t) => {
      if (!t.id) {
        throw new Error('Team has no id');
      }
      return t.id;
    });
    localStorage.setItem(
      `visible_teams_${clubId}`,
      this.visibleTeams?.[clubId]?.join(',')
    );

    this.generateCalendarDays();
  }

  public hideAllTeams(clubId: string) {
    if (!this.visibleTeams?.[clubId]) {
      throw new Error('Club not found');
    }
    this.visibleTeams[clubId] = [];
    localStorage.setItem(`visible_teams_${clubId}`, '');
    this.generateCalendarDays();
  }

  public selectDay(d?: Date, time?: string) {
    const date = moment(d);

    if (time) {
      // splite time to hour and minute
      const timeSplit = time?.split(':');
      const hour = timeSplit?.[0]?.trim() ?? '00';
      const minute = timeSplit?.[1]?.trim() ?? '00';

      date.set('hour', +hour);
      date.set('minute', +minute);
    }

    this.dialogRef.close(date.toDate());
  }

  private _genGridTemplateColumns(hasActivityOnDay: {
    [key: string]: boolean;
  }) {
    // Devide occuping space for each day
    const gridTemplate: string[] = [];

    for (const day of [...Array(7).keys()]) {
      if (hasActivityOnDay[day + 1]) {
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
        ownTeam?: boolean;
      }[];
    }[];
  }[];

  public hasSomeActivity?: boolean = false;

  otherEvents: {
    id: string;
    encounter: CompetitionEncounter;
    locationId?: number;
    startTime?: string;
    color?: string;
    removed: boolean;
    requested: boolean;
    ownTeam?: boolean;
  }[] = [];

  public getDateString() {
    return this.date?.toISOString().split('T')[0];
  }

  constructor(
    date?: moment.Moment,
    homeEvents?: DayEvent[],
    awayEvents?: DayEvent[],
    locations?: Map<number, Location>,
    visibleTeams?: string[]
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

        if (availibilityDays.length > 0) {
          this.hasSomeActivity = true;
        }

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
      this.addEvent(event, visibleTeams);
    }
    for (const event of awayEvents ?? []) {
      if (!event?.locationId) {
        throw new Error('LocationId is required');
      }
      if (
        event.encounter?.home?.id &&
        visibleTeams?.includes(event.encounter?.home?.id)
      ) {
        this.hasSomeActivity = true;
        this.otherEvents.push(event);
      }
    }
  }

  private addEvent(event: DayEvent, visibleTeams?: string[]) {
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

      if (availibilityIndex >= 0) {
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

        if (!event.encounter?.home?.id) {
          throw new Error('Home team is required');
        }

        if (visibleTeams?.includes(event.encounter?.home?.id)) {
          this.locations[locationIndex].availibility[
            availibilityIndex
          ].events?.push(event);
        }
      } else {
        if (!event.encounter?.home?.id) {
          throw new Error('away team is required');
        }

        if (!visibleTeams?.includes(event.encounter?.home?.id)) {
          return;
        }

        this.hasSomeActivity = true;
        // We have no availibility for this time
        this.locations[locationIndex]?.availibility?.push({
          startTime: event.startTime,
          totalCourts: 0,
          remainingEncounters: 0,
          option: 0,
          events: [event],
        });
      }
    }
  }
}

interface DayEvent {
  id: string;
  encounter: CompetitionEncounter;
  locationId?: number | undefined;
  startTime?: string | undefined;
  color?: string | undefined;
  removed: boolean;
  requested: boolean;
  ownTeam?: boolean | undefined;
}
