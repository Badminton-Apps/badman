import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RankingSystemService } from '@badman/frontend-graphql';
import { EntryCompetitionPlayer, Team } from '@badman/frontend-models';
import { SubEventType, sortTeams } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { CLUB, SEASON, TEAMS } from '../../../../../forms';
export type TeamFormValue = {
  team: Team;
  entry: {
    players: EntryCompetitionPlayer[];
    subEventId: string | null;
  };
};

export type TeamForm = FormGroup<{
  team: FormControl<Team>;
  entry: FormGroup<{
    players: FormArray<FormControl<EntryCompetitionPlayer | null>>;
    subEventId: FormControl<string | null>;
  }>;
}>;

@Component({
  selector: 'badman-teams-transfer-step',
  standalone: true,
  imports: [
    CommonModule,

    // Material
    MatCheckboxModule,
    MatButtonModule,
    MatProgressBarModule,

    // Other
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './teams-transfer.step.html',
  styleUrls: ['./teams-transfer.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsTransferStepComponent implements OnInit {
  private destroy$ = injectDestroy();

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<{
    [key in SubEventType]: FormArray<TeamForm>;
  }>;

  @Input()
  controlName = TEAMS;

  @Input()
  clubControlName = CLUB;

  @Input()
  clubId?: string;

  @Input()
  seasonControlName = SEASON;

  @Input()
  season?: number;

  teamsForm?: FormControl[] = [];
  newTeamsForm?: FormControl[] = [];

  teams$?: Observable<{
    lastSeason: Team[];
    newThisSeason: Team[];
  }>;
  teamSubscriptions: Subscription[] = [];

  constructor(
    private apollo: Apollo,
    private systemService: RankingSystemService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormGroup<{
        [key in SubEventType]: FormArray<TeamForm>;
      }>;
    }

    if (!this.control) {
      this.control = new FormGroup({
        M: new FormArray<TeamForm>([]),
        F: new FormArray<TeamForm>([]),
        MX: new FormArray<TeamForm>([]),
        NATIONAL: new FormArray<TeamForm>([]),
      });
    }

    if (this.group && !this.group?.get(this.controlName)) {
      this.group.addControl(this.controlName, this.control);
    }

    if (this.group === undefined) {
      if (this.clubId == undefined) {
        throw new Error('No clubId provided');
      }

      if (this.season == undefined) {
        throw new Error('No season provided');
      }
    }

    let clubid$: Observable<string>;
    let season$: Observable<number>;

    // fetch clubId
    if (this.group) {
      clubid$ = this.group?.valueChanges.pipe(
        map((value) => value?.[this.clubControlName]),
        startWith(this.group.value?.[this.clubControlName]),
      );

      season$ = this.group?.valueChanges.pipe(
        map((value) => value?.[this.seasonControlName]),
        startWith(this.group.value?.[this.seasonControlName]),
        filter((value) => value !== undefined),
      );
    } else {
      clubid$ = of(this.clubId as string);
      season$ = of(this.season as number);
    }

    this.teams$ = combineLatest([
      clubid$.pipe(distinctUntilChanged()),
      season$.pipe(distinctUntilChanged()),
    ])?.pipe(
      takeUntil(this.destroy$),
      switchMap(([clubId, season]) =>
        this.apollo
          .query<{ teams: Team[] }>({
            fetchPolicy: 'no-cache',
            query: gql`
              query Teams(
                $where: JSONObject
                $rankingWhere: JSONObject
                $order: [SortOrderType!]
              ) {
                teams(where: $where) {
                  id
                  name
                  teamNumber
                  type
                  season
                  link
                  clubId
                  preferredDay
                  preferredTime
                  captainId
                  phone
                  email
                  players {
                    id
                    fullName
                    teamId
                    gender
                    membershipType
                    rankingPlaces(
                      where: $rankingWhere
                      order: $order
                      take: 1
                    ) {
                      id
                      single
                      double
                      mix
                    }
                  }
                  entry {
                    id
                    standing {
                      id
                      riser
                      faller
                    }
                    subEventCompetition {
                      id
                      level
                      eventCompetition {
                        id
                        name
                        type
                      }
                    }
                    meta {
                      competition {
                        players {
                          id
                          gender
                          player {
                            id
                            fullName
                            rankingPlaces(
                              where: $rankingWhere
                              order: $order
                              take: 1
                            ) {
                              id
                              single
                              double
                              mix
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              where: {
                clubId: clubId,
                season: {
                  $or: [season - 1, season],
                },
              },
              rankingWhere: {
                systemId: this.systemService.systemId(),
                rankingDate: {
                  $lte: new Date(season, 5, 10),
                },
              },
              order: [
                {
                  field: 'rankingDate',
                  direction: 'DESC',
                },
              ],
            },
          })
          .pipe(
            map((result) => result.data.teams?.map((team) => new Team(team))),
            map((teams) => teams?.sort(sortTeams)),
            map((teams) => {
              const teamsLastSeason = teams?.filter(
                (team) => team.season == season - 1,
              );
              const teamsThisSeason = teams?.filter(
                (team) => team.season == season,
              );

              // we have 2 arrays, teams of last season
              // and teams that have been already created this season but don't have a link to last season

              const lastSeason = teamsLastSeason?.map((team) => {
                const teamThisSeason = teamsThisSeason?.find(
                  (t) => t.link == team.link,
                );

                if (teamThisSeason != null) {
                  // remove the team from the teamsThisSeason array
                  teamsThisSeason.splice(
                    teamsThisSeason.indexOf(teamThisSeason),
                    1,
                  );

                  // select the team
                  return {
                    ...team,
                    ...teamThisSeason,
                    selected: true,
                  } as Team & { selected: boolean };
                }

                return {
                  ...team,
                  id: uuidv4(),
                  selected: false,
                } as Team & { selected: boolean };
              });

              const linksLastSeason = lastSeason?.map((team) => team.link);
              const newThisSeason = teamsThisSeason
                ?.filter((team) => !linksLastSeason?.includes(team.link))
                ?.map((team) => {
                  return {
                    ...team,
                    selected: true,
                  } as Team & { selected: boolean };
                });

              return {
                lastSeason,
                newThisSeason,
              };
            }),
          ),
      ),
      shareReplay(1),
      tap(({ lastSeason, newThisSeason }) => {
        this.teamSubscriptions.forEach((sub) => sub.unsubscribe());

        // clear the form
        this.teamsForm = [];
        this.newTeamsForm = [];
        this.teamSubscriptions = [];

        for (const team of lastSeason ?? []) {
          const control = new FormControl(team.selected);
          this.teamsForm?.push(control);
          this.teamSubscriptions.push(
            control.valueChanges
              .pipe(startWith(team.selected), takeUntil(this.destroy$))
              .subscribe((value) => {
                if (value == null) {
                  return;
                }
                this.select(value, team);
              }),
          );
        }

        for (const team of newThisSeason ?? []) {
          const control = new FormControl(team.selected);
          this.newTeamsForm?.push(control);
          this.teamSubscriptions.push(
            control.valueChanges
              .pipe(startWith(team.selected), takeUntil(this.destroy$))
              .subscribe((value) => {
                if (value == null) {
                  return;
                }
                this.select(value, team);
              }),
          );
        }
      }),
    );
  }

  select(selected: boolean, team: Team & { selected: boolean }) {
    // if the team is already selected, we don't need to do anything
    const typedControl = this.control?.get(
      team.type ?? '',
    ) as FormArray<TeamForm>;

    const index = typedControl.value?.findIndex(
      (t) => t.team?.link == team.link,
    );

    if (selected) {
      // if the team is already selected, we don't need to do anything
      if (index != -1) {
        return;
      }

      let entry: {
        players: EntryCompetitionPlayer[];
        subEventId: string | null;
      };

      // convert entries
      if (team.entry) {
        entry = {
          players: (team.entry.meta?.competition?.players?.map((p) => {
            return {
              id: p.id,
              gender: p.gender,
              player: {
                id: p.player.id,
                fullName: p.player.fullName,
              },
              single: p.player.rankingPlaces?.[0].single ?? 0,
              double: p.player.rankingPlaces?.[0].double ?? 0,
              mix: p.player.rankingPlaces?.[0].mix ?? 0,
            };
          }) ?? []) as EntryCompetitionPlayer[],
          subEventId: null,
        };
      } else {
        entry = {
          players: [] as EntryCompetitionPlayer[],
          subEventId: null,
        };
      }
      if (typedControl) {
        if (index != null && index >= 0) {
          typedControl.at(index)?.get('team')?.patchValue(team);
          typedControl.at(index)?.get('entry')?.patchValue(entry);
        } else {
          const players = new FormArray<
            FormControl<EntryCompetitionPlayer | null>
          >([]);

          for (const player of entry.players) {
            players.push(new FormControl(player));
          }

          const newGroup = new FormGroup({
            team: new FormControl(team as Team),
            entry: new FormGroup({
              players,
              subEventId: new FormControl(entry.subEventId),
            }),
          }) as TeamForm;

          typedControl.push(newGroup);
        }
      } else {
        throw new Error('No control found for type ' + team.type);
      }
    } else {
      if (index != null && index >= 0) {
        typedControl.removeAt(index);
      }
    }

    // sort the teams
    typedControl?.controls?.sort((a, b) =>
      sortTeams(a.value.team, b.value.team),
    );

    this.changeDetectorRef.markForCheck();
  }

  selectAll(type: 'lastSeason' | 'newThisSeason') {
    const form = type == 'lastSeason' ? this.teamsForm : this.newTeamsForm;

    for (let i = 0; i < (form?.length ?? 0); i++) {
      form?.[i].setValue(true);
    }
  }

  deselectAll(type: 'lastSeason' | 'newThisSeason') {
    const form = type == 'lastSeason' ? this.teamsForm : this.newTeamsForm;

    for (let i = 0; i < (form?.length ?? 0); i++) {
      form?.[i].setValue(false);
    }
  }
}
