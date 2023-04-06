import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Team } from '@badman/frontend-models';
import { sortTeams } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, combineLatest, of } from 'rxjs';
import { filter, map, startWith, switchMap, tap } from 'rxjs/operators';

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
  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<{
    [key in 'M' | 'F' | 'MX' | 'NATIONAL']: FormControl<
      Team[] | null | undefined
    >;
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
  teams$?: Observable<Team[]>;

  constructor(
    private apollo: Apollo,
    private systemService: RankingSystemService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormGroup<{
        M: FormControl<Team[] | null | undefined>;
        F: FormControl<Team[] | null | undefined>;
        MX: FormControl<Team[] | null | undefined>;
        NATIONAL: FormControl<Team[] | null | undefined>;
      }>;
    }

    if (!this.control) {
      this.control = new FormGroup({
        M: new FormControl<Team[] | null | undefined>([]),
        F: new FormControl<Team[] | null | undefined>([]),
        MX: new FormControl<Team[] | null | undefined>([]),
        NATIONAL: new FormControl<Team[] | null | undefined>([]),
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
      clubid$,
      season$,
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
        })
      ),
    ])?.pipe(
      switchMap(([clubId, season, system]) =>
        this.apollo
          .watchQuery<{ teams: Team[] }>({
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
                    competitionSubEvent {
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
          .valueChanges.pipe(
            map((result) => result.data.teams?.map((team) => new Team(team))),
            map((teams) => teams?.sort(sortTeams)),
            map((teams) => {
              return teams
                ?.filter((team) => team.season == season - 1)
                ?.map((team) => {
                  return {
                    ...team,
                    selected:
                      teams?.find(
                        (t) => t.season == season && t.link == team.link
                      ) != null,
                  } as Team & { selected: boolean };
                });
            })
          )
      ),
      tap((teams) => {
        for (const team of teams ?? []) {
          const control = new FormControl(team.selected);
          this.teamsForm?.push(control);
          control.valueChanges.subscribe((value) => {
            if (value == null) {
              return;
            }
            this.select(value, team);
          });
        }
      })
    );
  }

  select(selected: boolean, team: Team & { selected: boolean }) {
    if (!team.id) {
      return;
    }

    if (selected) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, selected, ...rest } = team;

      const newTeam = new Team({
        ...rest,
        season: (rest.season ?? 0) + 1,
      });

      // convert entries
      if (newTeam.entry) {
        newTeam.entry = {
          ...newTeam.entry,
          meta: {
            competition: {
              teamIndex: 0, // get's calculated in next step
              players:
                newTeam.entry.meta?.competition?.players?.map((p) => {
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
                }) ?? [],
            },
          },
        };
      }

      this.control
        ?.get(team.type ?? '')
        ?.setValue([
          ...(this.control
            ?.get(team.type ?? '')
            ?.value?.filter((t: Team) => t.link != team.link) ?? []),
          newTeam,
        ]);
    } else {
      this.control
        ?.get(team.type ?? '')
        ?.setValue(
          this.control
            ?.get(team.type ?? '')
            ?.value?.filter((t: Team) => t.link !== team.link)
        );
    }

    this.changeDetectorRef.markForCheck();
  }

  selectAll() {
    for (let i = 0; i < (this.teamsForm?.length ?? 0); i++) {
      this.teamsForm?.[i].setValue(true);
    }
  }

  deselectAll() {
    for (let i = 0; i < (this.teamsForm?.length ?? 0); i++) {
      this.teamsForm?.[i].setValue(false);
    }
  }
}
