import { NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { HasClaimComponent } from '@badman/frontend-components';
import { EncounterChangeDate, EncounterCompetition, EventCompetition, Location, Team } from '@badman/frontend-models';
import { getCurrentSeason, sortTeams } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomLightColor } from 'seed-to-color';

@Component({
  selector: 'badman-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NgxMatDatetimePickerModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatSelectModule,
    MatSnackBarModule,
    HasClaimComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  manualDateControl: FormControl;
  manualLocationControl: FormControl;

  public firstDayOfMonth: moment.Moment;
  private season: number;
  public monthNames!: string[];
  public weekDayNames!: string[];
  public minDate!: Date;
  public maxDate!: Date;
  public gridTemplateColumns = '';

  public encounters: Map<string, EncounterCompetition[]> = new Map();
  public availibilities: Map<
    string,
    {
      locationId: string;
      time: string;
      courts: number;
    }[]
  > = new Map();

  public exceptions: Map<
    string,
    {
      locationId: string;
      courts: number;
    }[]
  > = new Map();
  public dayEvents: Map<string, string[]> = new Map();

  public changeRequests: Map<string, { request: EncounterChangeDate; encounter: EncounterCompetition }[]> = new Map();
  public teamColors = new Map<string, string>();
  public homeTeams: Team[] = [];
  public awayTeams: Team[] = [];
  public homeTeamsIds: string[] = [];
  public awayTeamsIds: string[] = [];
  public locations: Location[] = [];
  private event?: EventCompetition;

  public loadingCal = true;

  public days!: {
    date: Date;
    info: {
      locations: {
        space: number;
        time: string;
        locationId: string;
        locationIndex: number;

        encounters: EncounterCompetition[];
        removed: EncounterCompetition[];
        requested: EncounterCompetition[];
      }[];
      other: EncounterCompetition[];
      dayEvents: { color: string; name: string }[];
    };
  }[];

  public visibleTeams?: {
    [key: string]: string[];
  };

  constructor(
    public dialogRef: MatDialogRef<CalendarComponent>,
    private ref: ChangeDetectorRef,
    private snack: MatSnackBar,
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      homeClubId: string;
      awayClubId: string;
      awayTeamId: string;
      homeTeamId: string;
      date?: Date;
      locationId?: string;
      home?: boolean;
    },
    private apollo: Apollo,
  ) {
    // set date to closes 15 min
    const manualDate = moment(data?.date);
    if (manualDate.isValid()) {
      manualDate.set('minute', Math.ceil(manualDate.get('minute') / 15) * 15);
    }

    this.manualDateControl = new FormControl(manualDate.toDate());
    this.manualLocationControl = new FormControl(data?.locationId);

    this.firstDayOfMonth = moment(data.date);
    if (!this.firstDayOfMonth.isValid()) {
      this.firstDayOfMonth = moment();
    }
    this.firstDayOfMonth.startOf('month');
    this.season = getCurrentSeason(this.firstDayOfMonth);
    this.monthNames = moment.months();
    const weekdays = moment.weekdays();
    this.weekDayNames = [weekdays[1], weekdays[2], weekdays[3], weekdays[4], weekdays[5], weekdays[6], weekdays[0]];

    this.minDate = moment([this.season, 8, 1]).toDate();
    this.maxDate = moment([this.season + 1, 4, 1])
      .endOf('month')
      .toDate();
  }

  ngOnInit(): void {
    this._setupCalendar();
  }

  filterDate = (d: Date | null): boolean => {
    if (!d) {
      return false;
    }

    // filter out dates that are in the exception list
    const format = moment(d).format('YYYY-MM-DD');
    return !this.exceptions.has(format);
  };

  private async _setupCalendar() {
    this.locations = await this._getLocations();
    this.homeTeams = await this._getTeams(this.data.homeClubId);
    this.awayTeams = await this._getTeams(this.data.awayClubId);

    this.homeTeamsIds = this.homeTeams.map((t) => t.id ?? '');
    this.awayTeamsIds = this.awayTeams.map((t) => t.id ?? '');

    this._setColors(this.homeTeams);
    this._showVisible([...this.homeTeams, ...this.awayTeams]);
    this._loadMonth();
  }

  private async _loadMonth() {
    this.loadingCal = true;

    const weeks = this._getWeeksInView();
    // Get first day of month
    const start = this.firstDayOfMonth.clone();
    // Go back untill we get to the first day of the week
    while (start.day() != 1) {
      start.subtract(1, 'day');
    }
    const end = this.firstDayOfMonth.clone().add(weeks, 'weeks');

    await this._loadEvent();
    this._loadAvailiblilyBetween(start, end);
    this._loadDayEvents();

    // Get the encounters, and use the first home encounter to
    await this._loadEncountersBetween(start, end);

    this._generateCalendarDays(weeks);
    this._genGridTemplateColumns();

    this.loadingCal = false;
    this.ref.detectChanges();
  }

  private _generateCalendarDays(weeks: number): void {
    // Reset calendar
    const days = [];

    // Get first day of month
    const day = this.firstDayOfMonth.clone();

    // Go back untill we get to the first day of the week
    while (day.day() != 1) {
      day.subtract(1, 'day');
    }

    for (let i = 0; i < weeks * 7; i++) {
      days.push({
        date: day.clone().toDate(),
        info: this._getDayInfo(day.clone().toDate()),
      });

      day.add(1, 'days');
    }

    this.days = days;
  }

  private _loadAvailiblilyBetween(start: moment.Moment, end: moment.Moment) {
    this.availibilities.clear();
    this.exceptions.clear();

    for (const location of this.locations) {
      const availibilities = location.availibilities?.filter((a) => {
        return a.season === this.season;
      });

      if (!availibilities) {
        continue;
      }

      for (const availibility of availibilities) {
        for (const aDay of availibility.days) {
          for (let day = start.clone(); day.isBefore(end); day.add(1, 'day')) {
            const wDay = moment(day);
            const format = wDay.format('YYYY-MM-DD');

            if (wDay.locale('en').format('dddd').toLocaleLowerCase() === aDay.day) {
              if (!this.availibilities.has(format)) {
                this.availibilities.set(format, []);
              }

              this.availibilities.get(format)?.push({
                locationId: location.id ?? '',
                time: aDay.startTime ?? '',
                courts: aDay.courts ?? 0,
              });
            }

            for (const exception of availibility.exceptions) {
              const start = moment(exception.start);
              const end = moment(exception.end);

              if (wDay.isBetween(start, end, 'day', '[]')) {
                if (!this.exceptions.has(format)) {
                  this.exceptions.set(format, []);
                }

                this.exceptions.get(format)?.push({
                  locationId: location.id ?? '',
                  courts: exception.courts ?? 0,
                });
              }
            }
          }
        }
      }
    }

    if (this.event?.exceptions) {
      for (const exception of this.event?.exceptions ?? []) {
        const start = moment(exception.start);
        const end = moment(exception.end);

        // for each day in the exception
        // push the exception to the exceptions map
        for (let day = start.clone(); day.isSameOrBefore(end); day.add(1, 'day')) {
          const format = day.format('YYYY-MM-DD');

          // clear out the exceptions
          this.exceptions.set(format, []);

          for (const location of this.locations) {
            this.exceptions.get(format)?.push({
              locationId: location.id ?? '',
              courts: exception.courts ?? 0,
            });
          }
        }
      }
    }
  }

  private _loadDayEvents() {
    this.dayEvents.clear();

    if (this.event?.infoEvents) {
      for (const event of this.event?.infoEvents ?? []) {
        const start = moment(event.start);
        const end = moment(event.end);

        // for each day in the exception
        // push the exception to the exceptions map
        for (let day = start.clone(); day.isSameOrBefore(end); day.add(1, 'day')) {
          const format = day.format('YYYY-MM-DD');

          if (!this.dayEvents.has(format)) {
            this.dayEvents.set(format, []);
          }

          this.dayEvents.get(format)?.push(event.name ?? '');
        }
      }
    }
  }

  private _genGridTemplateColumns() {
    const hasActivityOnDay = this.weekDayNames.reduce(
      (acc, day) => {
        acc[day.toLocaleLowerCase()] = false;
        return acc;
      },
      {} as { [key: string]: boolean },
    );

    for (const day of this.days) {
      const weekdayName = moment(day.date).format('dddd').toLocaleLowerCase();

      // if we already have activity on this day, skip
      if (hasActivityOnDay[weekdayName]) {
        continue;
      }

      const date = moment(day.date).format('YYYY-MM-DD');
      const enc = this.encounters.get(date);
      const locations = day.info.locations;

      if (enc?.some((e) => this._isVisible(e.homeTeamId) || this._isVisible(e.awayTeamId)) || locations?.length > 0) {
        // if any of the teams is visible
        hasActivityOnDay[weekdayName] = true;
      }
    }

    // Devide occuping space for each day
    const gridTemplate: string[] = [];

    for (const day of this.weekDayNames) {
      if (hasActivityOnDay[day]) {
        gridTemplate.push(`1fr`);
      } else {
        gridTemplate.push(`0.50fr`);
      }
    }

    this.gridTemplateColumns = gridTemplate.join(' ');
  }

  private _getWeeksInView() {
    const day = this.firstDayOfMonth.clone();

    // Get the last day of the month
    const lastday = this.firstDayOfMonth.clone().endOf('month');

    // Go forward untill we get to the last day of the week
    const daysBetween = lastday.diff(day, 'days');

    // Calculate amount of weeks we need to display
    const weeks = Math.ceil(daysBetween / 7);

    return weeks;
  }

  private async _loadEncountersBetween(start: moment.Moment, end: moment.Moment) {
    this.encounters.clear();
    this.changeRequests.clear();

    const teams = [...(this.homeTeams?.map((t) => t.id) ?? []), ...(this.awayTeams?.map((t) => t.id) ?? [])];

    // get all encounters where any of the teams is home or away

    const homeEncounters = await lastValueFrom(
      this.apollo
        .query<{
          encounterCompetitions: {
            count: number;
            rows: Partial<EncounterCompetition>[];
          };
        }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetHomeEncountersForTeams($where: JSONObject, $order: [SortOrderType!]) {
              encounterCompetitions(where: $where, order: $order) {
                count
                rows {
                  id
                  date
                  locationId
                  homeTeamId
                  awayTeamId
                  encounterChange {
                    accepted
                    dates {
                      locationId
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
                $between: [start.toDate(), end.toDate()],
              },
              homeTeamId: {
                $in: teams,
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
                  return new EncounterCompetition(e);
                }) ?? [],
            };
          }),
        ),
    );
    const awayEncounters = await lastValueFrom(
      this.apollo
        .query<{
          encounterCompetitions: {
            count: number;
            rows: Partial<EncounterCompetition>[];
          };
        }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetHomeEncountersForTeams($where: JSONObject, $order: [SortOrderType!]) {
              encounterCompetitions(where: $where, order: $order) {
                count
                rows {
                  id
                  date
                  locationId
                  homeTeamId
                  awayTeamId
                  encounterChange {
                    accepted
                    dates {
                      locationId
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
                $between: [start.toDate(), end.toDate()],
              },
              awayTeamId: {
                $in: teams,
              },
              id: {
                $notIn: homeEncounters.encounters.map((e) => e.id),
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
                  return new EncounterCompetition(e);
                }) ?? [],
            };
          }),
        ),
    );

    for (const encounter of [...homeEncounters.encounters, ...awayEncounters.encounters]) {
      const date = moment(encounter.date).format('YYYY-MM-DD');

      if (!this.encounters.has(date)) {
        this.encounters.set(date, []);
      }

      this.encounters.get(date)?.push(encounter);

      for (const request of encounter.encounterChange?.dates ?? []) {
        const date = moment(request.date).format('YYYY-MM-DD');

        if (!this.changeRequests.has(date)) {
          this.changeRequests.set(date, []);
        }

        this.changeRequests.get(date)?.push({ request: request, encounter });
      }
    }
  }

  private async _loadEvent() {
    // get the first encounter of the home team
    this.event = await lastValueFrom(
      this.apollo
        .query<{
          team: Partial<Team>;
        }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetHomeTeamsEvent($id: ID!) {
              team(id: $id) {
                id
                entry {
                  id
                  subEventCompetition {
                    id
                    eventCompetition {
                      id
                      exceptions {
                        courts
                        end
                        start
                      }
                      infoEvents {
                        name
                        end
                        start
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: {
            id: this.data.homeTeamId,
          },
        })
        .pipe(map((x) => new Team(x.data.team)?.entry?.subEventCompetition?.eventCompetition)),
    );
  }

  private async _getTeams(clubid: string) {
    return lastValueFrom(
      this.apollo
        .query<{ club: { teams: Team[] } }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetClubTeams($clubId: ID!, $season: Int!) {
              club(id: $clubId) {
                id
                teams(where: { season: $season }) {
                  id
                  name
                  type
                  teamNumber
                  abbreviation
                }
              }
            }
          `,
          variables: {
            clubId: clubid,
            season: this.season,
          },
        })
        .pipe(
          map((result) => {
            return result.data?.club.teams?.map((team) => new Team(team));
          }),
          map((teams) => teams.sort(sortTeams)),
        ),
    );
  }

  private async _getLocations() {
    return await lastValueFrom(
      this.apollo
        .query<{ club: { locations: Location[] } }>({
          fetchPolicy: 'cache-first',
          query: gql`
            query GetClubLocation($clubId: ID!, $season: Int!) {
              club(id: $clubId) {
                id
                locations {
                  id
                  name
                  availibilities(where: { season: $season }) {
                    id
                    season
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
            season: this.season,
          },
        })
        .pipe(
          map((result) => {
            return result.data?.club?.locations?.map((location) => {
              return new Location(location);
            });
          }),
        ),
    );
  }

  private _setColors(teams: Team[]) {
    for (const team of teams) {
      this.teamColors.set(team?.id ?? '', `#${randomLightColor(team?.name ?? '')}`);
    }
  }

  private _showVisible(teams: Team[]) {
    const homeTeamsStorage = localStorage.getItem(`visible_teams_${this.data.homeClubId}`)?.split(',');

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

    const awayTeamsStorage = localStorage.getItem(`visible_teams_${this.data.awayClubId}`)?.split(',');
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

  public increaseMonth() {
    this.firstDayOfMonth.add(1, 'month');

    this._loadMonth();
  }

  public decreaseMonth() {
    this.firstDayOfMonth.subtract(1, 'month');
    this._loadMonth();
  }

  public setCurrentMonth() {
    this.firstDayOfMonth.set('month', moment().get('month'));
    this._loadMonth();
  }

  public selectDay(d?: Date, time?: string, locationId?: string, space?: number) {
    const date = moment(d);

    if ((space ?? 0) <= 0) {
      this.snack.open(this.translate.instant('all.competition.change-encounter.calendar.no-space'), 'Ok', {
        // duration: 4000,
        panelClass: 'error',
      });
      return;
    }

    if (time) {
      // splite time to hour and minute
      const timeSplit = time?.split(':');
      const hour = timeSplit?.[0]?.trim() ?? '00';
      const minute = timeSplit?.[1]?.trim() ?? '00';

      date.set('hour', +hour);
      date.set('minute', +minute);
    }

    this.dialogRef.close({
      date: date.toDate(),
      locationId: locationId,
    });
  }

  private _getDayInfo(date: Date) {
    const dayInfo: {
      locations: {
        space: number;
        time: string;
        locationId: string;
        locationIndex: number;
        encounters: EncounterCompetition[];
        removed: EncounterCompetition[];
        requested: EncounterCompetition[];
      }[];
      dayEvents: { color: string; name: string }[];
      other: EncounterCompetition[];
    } = {
      dayEvents: [],
      locations: [],
      other: [],
    };

    const day = moment(date);
    const format = day.format('YYYY-MM-DD');

    const encounters = this.encounters.get(format);
    const changeRequests = this.changeRequests.get(format);
    const availibilities = this.availibilities.get(format);
    const exceptions = this.exceptions.get(format);

    // only load availibility stating from 1st of september untill last of may
    if ((day.month() < 8 && day.year() == this.season) || (day.month() > 4 && day.year() == this.season + 1)) {
      return dayInfo;
    }

    if (this.dayEvents.has(format)) {
      for (const name of this.dayEvents.get(format) ?? []) {
        dayInfo.dayEvents.push({
          name,
          color: `#${randomLightColor(name)}`,
        });
      }
    }

    if (availibilities) {
      for (const availibility of availibilities) {
        dayInfo.locations.push({
          space: Math.floor(availibility.courts / 2),
          time: availibility.time,
          locationId: availibility.locationId,
          locationIndex: this.locations.findIndex((l) => l.id === availibility.locationId) + 1,
          encounters: [],
          removed: [],
          requested: [],
        });
      }

      for (const exception of exceptions ?? []) {
        // find availibility for location
        const availibility = dayInfo.locations.find((l) => l.locationId === exception.locationId);

        if (availibility) {
          availibility.space = Math.floor(exception.courts / 2);
        }
      }
    }

    if (encounters) {
      for (const encounter of encounters) {
        const infoIndex = dayInfo.locations.findIndex((l) => l.locationId === encounter.locationId);

        if (infoIndex >= 0) {
          // if there is an request
          if (encounter.encounterChange && !encounter.encounterChange.accepted) {
            dayInfo.locations[infoIndex].removed.push(encounter);
          } else {
            // if the home team is visible
            if (this._isVisible(encounter.homeTeamId)) {
              dayInfo.locations[infoIndex].encounters.push(encounter);
            }
          }

          dayInfo.locations[infoIndex].space = Math.max(0, dayInfo.locations[infoIndex].space - 1);
        }
      }
    }

    for (const request of changeRequests ?? []) {
      const infoIndex = dayInfo.locations.findIndex((l) => l.locationId === request?.request?.locationId);

      if (infoIndex >= 0) {
        dayInfo.locations[infoIndex].requested.push(request.encounter);
      }
    }

    // filter out encounters that are not for the selected teams
    if (encounters) {
      dayInfo.other = encounters.filter(
        (e) =>
          // exclude all encouters where it is the hometeam
          !this.homeTeamsIds.includes(e.homeTeamId ?? '') &&
          // others should be visible
          (this._isVisible(e.homeTeamId) || this._isVisible(e.awayTeamId)),
      );
    }

    return dayInfo;
  }

  private _isVisible(teamId?: string) {
    return (
      this.visibleTeams?.[this.data.homeClubId]?.includes(teamId ?? '') ||
      this.visibleTeams?.[this.data.awayClubId]?.includes(teamId ?? '')
    );
  }

  public changeVisibleTeams(event: MatCheckboxChange, teamId: string, clubId: string) {
    if (!teamId) {
      return;
    }
    if (!this.visibleTeams?.[clubId]) {
      return;
    }

    if (event.checked) {
      this.visibleTeams?.[clubId].push(teamId);
    } else {
      this.visibleTeams?.[clubId].splice(this.visibleTeams?.[clubId].indexOf(teamId), 1);
    }

    localStorage.setItem(`visible_teams_${clubId}`, this.visibleTeams?.[clubId]?.join(',') ?? '');

    this._loadMonth();
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
    localStorage.setItem(`visible_teams_${clubId}`, this.visibleTeams?.[clubId]?.join(','));

    this._loadMonth();
  }

  public hideAllTeams(clubId: string) {
    if (!this.visibleTeams?.[clubId]) {
      throw new Error('Club not found');
    }
    this.visibleTeams[clubId] = [];
    localStorage.setItem(`visible_teams_${clubId}`, '');
    this._loadMonth();
  }
}
