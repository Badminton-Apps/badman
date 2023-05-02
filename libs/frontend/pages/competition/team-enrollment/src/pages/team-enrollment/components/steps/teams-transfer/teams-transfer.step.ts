import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
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
import { sortTeams } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, Subject, Subscription, combineLatest, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
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
export class TeamsTransferStepComponent implements OnInit, OnDestroy {
  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<{
    [key in 'M' | 'F' | 'MX' | 'NATIONAL']: FormArray<TeamForm>;
  }>;

  @Input()
  controlName = 'teams';

  @Input()
  clubControlName = 'club';

  @Input()
  clubId?: string;

  @Input()
  seasonControlName = 'season';

  @Input()
  season?: number;

  teamsForm?: FormControl[] = [];
  newTeamsForm?: FormControl[] = [];

  teams$?: Observable<{
    lastSeason: Team[];
    newThisSeason: Team[];
  }>;
  teamSubscriptions: Subscription[] = [];
  destroy$ = new Subject<void>();

  constructor(
    private apollo: Apollo,
    private systemService: RankingSystemService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormGroup<{
        [key in 'M' | 'F' | 'MX' | 'NATIONAL']: FormArray<TeamForm>;
      }>;

      if (!this.control) {
        this.control = new FormGroup({
          M: new FormArray<TeamForm>([]),
          F: new FormArray<TeamForm>([]),
          MX: new FormArray<TeamForm>([]),
          NATIONAL: new FormArray<TeamForm>([]),
        });
      }

      if (this.group) {
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
          filter((value) => value !== undefined && value?.length > 0),
          filter(
            (value) =>
              value.length === 36 &&
              value[8] === '-' &&
              value[13] === '-' &&
              value[18] === '-' &&
              value[23] === '-'
          )
        );

        season$ = this.group?.valueChanges.pipe(
          map((value) => value?.[this.seasonControlName]),
          startWith(this.group.value?.[this.seasonControlName]),
          filter((value) => value !== undefined)
        );
      } else {
        clubid$ = of(this.clubId as string);
        season$ = of(this.season as number);
      }

      this.teams$ = combineLatest([
        clubid$.pipe(distinctUntilChanged()),
        season$.pipe(distinctUntilChanged()),
        this.systemService.getPrimarySystemId().pipe(
          switchMap((id) =>
            this.apollo.query<{
              rankingSystem: { id: string };
            }>({
              query: gql`
                query RankingSystem($id: ID!) {
                  rankingSystem(id: $id) {
                    id
                  }
                }
              `,
              variables: {
                id: id,
              },
            })
          ),
          map((result) => result.data.rankingSystem),
          tap((id) => {
            if (id == undefined) {
              throw new Error('No ranking system found');
            }

            if (!this.group?.get('rankingSystem')) {
              this.group?.addControl('rankingSystem', new FormControl(id));
            } else {
              this.group?.get('rankingSystem')?.setValue(id);
            }
          }),
          distinctUntilChanged()
        ),
      ])?.pipe(
        takeUntil(this.destroy$),
        switchMap(([clubId, season, system]) =>
          this.apollo
            .query<{ teams: Team[] }>({
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
                  systemId: system.id,

                  // TODO: we should use the correct date here

                  // rankingDate: {
                  //   $between: [new Date(season - 1, 0, 1), new Date(season, 0, 1)],
                  // },
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
                  (team) => team.season == season - 1
                );
                const teamsThisSeason = teams?.filter(
                  (team) => team.season == season
                );

                // we have 2 arrays, teams of last season
                // and teams that have been already created this season but don't have a link to last season

                const lastSeason = teamsLastSeason?.map((team) => {
                  const teamThisSeason = teamsThisSeason?.find(
                    (t) => t.link == team.link
                  );
                  return {
                    ...team,
                    id: uuidv4(),
                    selected: teamThisSeason != null,
                  } as Team & { selected: boolean };
                });

                const newThisSeason = teamsThisSeason
                  ?.filter((team) => team.link == null)
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
              })
            )
        ),
        shareReplay(1),
        tap(({ lastSeason, newThisSeason }) => {
          this.teamSubscriptions.forEach((sub) => sub.unsubscribe());

          for (const team of lastSeason ?? []) {
            const control = new FormControl(team.selected);
            this.teamsForm?.push(control);
            this.teamSubscriptions.push(
              control.valueChanges.subscribe((value) => {
                if (value == null) {
                  return;
                }
                this.select(value, team);
              })
            );
          }

          for (const team of newThisSeason ?? []) {
            const control = new FormControl(team.selected);
            this.newTeamsForm?.push(control);
            this.teamSubscriptions.push(
              control.valueChanges.subscribe((value) => {
                if (value == null) {
                  return;
                }
                this.select(value, team);
              })
            );
          }
        })
      );
    }
  }

  select(selected: boolean, team: Team & { selected: boolean }) {
    // if the team is already selected, we don't need to do anything
    const typedControl = this.control?.get(
      team.type ?? ''
    ) as FormArray<TeamForm>;
    const index = typedControl.value?.findIndex(
      (t) => t.team?.link == team.link
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
      if (index) {
        typedControl.removeAt(index);
      }
    }

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

  ngOnDestroy() {
    this.teamSubscriptions.forEach((sub) => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }
}
