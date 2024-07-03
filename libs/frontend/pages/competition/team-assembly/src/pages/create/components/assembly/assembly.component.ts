import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  copyArrayItem,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  OnInit,
  PLATFORM_ID,
  signal,
  TemplateRef,
  TransferState,
  ViewChild,
  output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthenticateService } from '@badman/frontend-auth';
import { HasClaimComponent, PlayerSearchComponent } from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import {
  Assembly,
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  Player,
  Team,
  TeamPlayer,
} from '@badman/frontend-models';
import { EditDialogComponent } from '@badman/frontend-team';
import { DEVICE, transferState } from '@badman/frontend-utils';
import { TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment, { Moment } from 'moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { NgxResize, ResizeResult } from 'ngxtension/resize';
import { combineLatest, lastValueFrom, of, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { ValidationMessage, ValidationResult } from '../../models/validation';
import { AssemblyMessageComponent } from '../assembly-message/assembly-message.component';
import { TeamAssemblyPlayerComponent } from '../team-assembly-player';

export const SAVED_ASSEMBLY = gql`
  query SavedAssembly($id: ID!, $where: JSONObject) {
    encounterCompetition(id: $id) {
      id
      assemblies(where: $where) {
        id
        assembly {
          single1
          single2
          single3
          single4
          double1
          double2
          double3
          double4
          subtitudes
        }
        captainId
      }
    }
  }
`;

@Component({
  selector: 'badman-assembly',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TeamAssemblyPlayerComponent,
    PlayerSearchComponent,
    AssemblyMessageComponent,
    HasClaimComponent,
    NgxResize,
    MatTooltipModule,
    DragDropModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './assembly.component.html',
  styleUrls: ['./assembly.component.scss'],
})
export class AssemblyComponent implements OnInit {
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);
  private authenticateService = inject(AuthenticateService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private stateTransfer = inject(TransferState);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private platformId = inject<string>(PLATFORM_ID);
  private destroy$ = injectDestroy();

  isHandset = inject(DEVICE);

  group = input.required<FormGroup>();

  type = signal<string | undefined>(undefined);

  wherePlayer = computed(() => ({
    gender: this.type() === 'MX' ? undefined : this.type,
  }));

  @ViewChild('validationOverview')
  validationTemplateRef?: TemplateRef<HTMLElement>;

  validationOverview = output<{
    valid: boolean;
    template: TemplateRef<HTMLElement>;
  }>();

  lists = [
    'playerList',
    'substitudeList',
    'single1List',
    'single2List',
    'single3List',
    'single4List',
    'double1List',
    'double2List',
    'double3List',
    'double4List',
  ];

  single1: TeamPlayer[] = [];
  single2: TeamPlayer[] = [];
  single3: TeamPlayer[] = [];
  single4: TeamPlayer[] = [];

  double1: TeamPlayer[] = [];
  double2: TeamPlayer[] = [];
  double3: TeamPlayer[] = [];
  double4: TeamPlayer[] = [];

  substitutes: TeamPlayer[] = [];
  showBackup = false;

  players?: { [key in TeamMembershipType]: TeamPlayer[] };

  titulars: {
    index: number;
    players: (TeamPlayer & {
      single: number;
      double: number;
      mix: number;
      sum: number;
    })[];
  } = {
    index: 0,
    players: [],
  };
  base: {
    index: number;
    players: (TeamPlayer & {
      single: number;
      double: number;
      mix: number;
      sum: number;
    })[];
  } = {
    index: 0,
    players: [],
  };

  captionSingle1Prefix = '';
  captionSingle2Prefix = '';
  captionSingle3Prefix = '';
  captionSingle4Prefix = '';
  captionDouble1Prefix = '';
  captionDouble2Prefix = '';
  captionDouble3Prefix = '';
  captionDouble4Prefix = '';

  captionSingle1 = 'all.competition.team-assembly.single1';
  captionSingle2 = 'all.competition.team-assembly.single2';
  captionSingle3 = 'all.competition.team-assembly.single3';
  captionSingle4 = 'all.competition.team-assembly.single4';

  captionDouble1 = 'all.competition.team-assembly.double1';
  captionDouble2 = 'all.competition.team-assembly.double2';
  captionDouble3 = 'all.competition.team-assembly.double3';
  captionDouble4 = 'all.competition.team-assembly.double4';

  updatedAssembly$ = new Subject();

  team?: Team;
  club!: string;

  entry?: EventEntry;

  ignorePlayers!: Player[];
  loaded = false;
  gotRequired = false;
  errors?: ValidationMessage[];
  warnings?: ValidationMessage[];

  startRanking?: Moment;
  endRanking?: Moment;

  notSmallScreen = true;

  isException(id?: string) {
    if (!id) {
      return false;
    }

    return (
      this.team?.entry?.meta?.competition?.players?.find((p) => p.id === id)?.levelException ??
      false
    );
  }

  ngOnInit() {
    this.group().addControl('single1', new FormControl());
    this.group().addControl('single2', new FormControl());
    this.group().addControl('single3', new FormControl());
    this.group().addControl('single4', new FormControl());
    this.group().addControl('double1', new FormControl());
    this.group().addControl('double2', new FormControl());
    this.group().addControl('double3', new FormControl());
    this.group().addControl('double4', new FormControl());
    this.group().addControl('subtitudes', new FormControl());
    this.group().addControl('captain', new FormControl());

    const encounterCntrl = this.group().get('encounter');
    if (!encounterCntrl) {
      throw new Error('encounter is not set');
    }

    const teamCntrl = this.group().get('team');
    if (!teamCntrl) {
      throw new Error('team is not set');
    }

    combineLatest([teamCntrl.valueChanges, encounterCntrl.valueChanges.pipe(startWith(undefined))])
      .pipe(
        takeUntil(this.destroy$),
        map(([team, encounter]) => {
          return [team != null, encounter] as const;
        }),
      )
      .subscribe(async ([gotRequired, encounter]) => {
        this.gotRequired = gotRequired;

        console.log('gotRequired', gotRequired);

        if (gotRequired) {
          await this.loadData(encounter);
          this.updatedAssembly$
            .pipe(
              tap(() => {
                this.group().get('single1')?.setValue(this.single1[0]);
                this.group().get('single2')?.setValue(this.single2[0]);
                this.group().get('single3')?.setValue(this.single3[0]);
                this.group().get('single4')?.setValue(this.single4[0]);
                this.group().get('double1')?.setValue(this.double1);
                this.group().get('double2')?.setValue(this.double2);
                this.group().get('double3')?.setValue(this.double3);
                this.group().get('double4')?.setValue(this.double4);
                this.group().get('subtitudes')?.setValue(this.substitutes);
                this._sortLists();
              }),
              switchMap(() => {
                return this._checkAssembly();
              }),
            )
            .subscribe((validation) => this.updateValidations(validation));

          this.updatedAssembly$.next(true);
        }
      });
  }

  async loadData(encounterId?: string) {
    this.loaded = false;

    // Clear everything
    this.group().get('single1')?.reset();
    this.group().get('single2')?.reset();
    this.group().get('single3')?.reset();
    this.group().get('single4')?.reset();
    this.group().get('double1')?.reset();
    this.group().get('double2')?.reset();
    this.group().get('double3')?.reset();
    this.group().get('double4')?.reset();
    this.group().get('subtitudes')?.reset();

    this.single1 = [];
    this.single2 = [];
    this.single3 = [];
    this.single4 = [];

    this.double1 = [];
    this.double2 = [];
    this.double3 = [];
    this.double4 = [];

    this.substitutes = [];

    // Get values
    this.club = this.group().get('club')?.value;
    const teamId = this.group().get('team')?.value;

    this._getTeam(teamId, encounterId).subscribe(async (team) => {
      this.type.set(team.type);

      this.players = team.players.reduce(
        (acc, player) => {
          if (!player.teamMembership.membershipType) {
            player.teamMembership.membershipType = TeamMembershipType.REGULAR;
          }

          if (!acc[player.teamMembership.membershipType]) {
            acc[player.teamMembership.membershipType] = [] as TeamPlayer[];
          }

          acc[player.teamMembership.membershipType].push(player);

          return acc;
        },
        {
          [TeamMembershipType.REGULAR]: [] as TeamPlayer[],
          [TeamMembershipType.BACKUP]: [] as TeamPlayer[],
        },
      );

      // Take first of saved if available
      const saved = (await lastValueFrom(this._loadSaved(encounterId, team.captainId)))?.[0];

      if (saved?.id) {
        this.snackBar.open('Saved assembly loaded', undefined, {
          duration: 2000,
        });
      }

      this.group()
        .get('captain')
        ?.setValue(saved?.captainId || team.captainId);

      // fetch all players that are in the assembly, but not in the current players list
      await Promise.all(
        [
          ...new Set([
            ...(saved?.assembly?.double1 ?? []),
            ...(saved?.assembly?.double2 ?? []),
            ...(saved?.assembly?.double3 ?? []),
            ...(saved?.assembly?.double4 ?? []),
            saved?.assembly?.single1,
            saved?.assembly?.single2,
            saved?.assembly?.single3,
            saved?.assembly?.single4,
            ...(saved?.assembly?.subtitudes ?? []),
          ]),
        ]
          ?.filter(
            (id) =>
              ![this.players?.BACKUP, this.players?.REGULAR]
                .flat(1)
                .find((player) => player?.id === id),
          )
          ?.filter((id) => id != null && id !== '' && id !== undefined)
          .map((id) => this.addPlayer({ id } as Player)),
      );

      if (saved?.assembly?.double1) {
        this.double1 = this._getPlayers(saved.assembly.double1);
      }

      if (saved?.assembly?.double2) {
        this.double2 = this._getPlayers(saved.assembly.double2);
      }

      if (saved?.assembly?.double3) {
        this.double3 = this._getPlayers(saved.assembly.double3);
      }

      if (saved?.assembly?.double4) {
        this.double4 = this._getPlayers(saved.assembly.double4);
      }

      if (saved?.assembly?.single1) {
        this.single1 = this._getPlayers([saved.assembly.single1]);
      }

      if (saved?.assembly?.single2) {
        this.single2 = this._getPlayers([saved.assembly.single2]);
      }

      if (saved?.assembly?.single3) {
        this.single3 = this._getPlayers([saved.assembly.single3]);
      }

      if (saved?.assembly?.single4) {
        this.single4 = this._getPlayers([saved.assembly.single4]);
      }

      if (saved?.assembly?.subtitudes) {
        this.substitutes = this._getPlayers(saved.assembly.subtitudes);
      }

      this._sortLists();
      this._setTranslations();

      this.team = team;

      // Trigger form change
      this.updatedAssembly$.next(true);
      this.loaded = true;
    });
  }

  async addPlayer(player: Player) {
    if (!player.id) {
      return;
    }
    const playerRankings = await lastValueFrom(
      this.apollo
        .query<{ player: Player }>({
          query: gql`
            query getPlayerInfo(
              $playerId: ID!
              $rankingWhere: JSONObject
              $lastRankginWhere: JSONObject
            ) {
              player(id: $playerId) {
                id
                slug
                fullName
                gender
                competitionPlayer
                rankingLastPlaces(where: $lastRankginWhere) {
                  id
                  single
                  double
                  mix
                }
                rankingPlaces(where: $rankingWhere) {
                  id
                  rankingDate
                  single
                  double
                  mix
                }
              }
            }
          `,
          variables: {
            playerId: player.id,
            rankingWhere: {
              rankingDate: {
                $between: [this.startRanking, this.endRanking],
              },
              systemId: this.systemService.systemId(),
            },
            lastRankginWhere: {
              systemId: this.systemService.systemId(),
            },
          },
        })
        .pipe(map((x) => new Player(x.data?.player))),
    );

    this.players?.REGULAR?.push(playerRankings as TeamPlayer);
    this._sortLists();
    this.changeDetectorRef.detectChanges();
  }

  updateValidations(info: ValidationResult) {
    this.base = {
      index: info.baseTeamIndex,
      players: info.baseTeamPlayers?.map((p) => {
        return {
          ...p,
          sum: p.single + p.double + ((this.type() ?? 'MX') === 'MX' ? p.mix : 0),
        } as TeamPlayer & {
          single: number;
          double: number;
          mix: number;
          sum: number;
        };
      }),
    };
    this.titulars = {
      index: info.titularsIndex,
      players: info.titularsPlayers?.map((p) => {
        return {
          ...p,
          sum: p.single + p.double + ((this.type() ?? 'MX') === 'MX' ? p.mix : 0),
        } as TeamPlayer & {
          single: number;
          double: number;
          mix: number;
          sum: number;
        };
      }),
    };

    this.errors = info.errors;
    this.warnings = info.warnings;
    if (this.validationTemplateRef) {
      this.validationOverview.emit({
        valid: info.valid,
        template: this.validationTemplateRef,
      });
    }
  }

  selectedCaptain(player: Player) {
    this.group().get('captain')?.setValue(player.id);
  }

  canDropPredicate = (item: CdkDrag, drop: CdkDropList<Player[]>) => {
    const length = drop?.data?.length ?? 0;

    if (drop?.id.includes('single')) {
      if (length >= 1) {
        return false;
      }
    }

    if (drop?.id.includes('double')) {
      if (length >= 2) {
        return false;
      }
    }

    if (drop?.id.includes('substitude')) {
      // Check if any of the lists already has the player
      if (
        this.single1.findIndex((x) => x.id == item.data.id) != -1 ||
        this.single2.findIndex((x) => x.id == item.data.id) != -1 ||
        this.single3.findIndex((x) => x.id == item.data.id) != -1 ||
        this.single4.findIndex((x) => x.id == item.data.id) != -1 ||
        this.double1.findIndex((x) => x.id == item.data.id) != -1 ||
        this.double2.findIndex((x) => x.id == item.data.id) != -1 ||
        this.double3.findIndex((x) => x.id == item.data.id) != -1 ||
        this.double4.findIndex((x) => x.id == item.data.id) != -1
      ) {
        return false;
      }
    }

    if (drop?.data?.map((r) => r.id).includes(item.data.id)) {
      return false;
    }

    if (this.type() == 'MX') {
      if (drop.id == 'double1List' && item.data.gender == 'F') {
        return false;
      } else if (drop.id == 'double2List' && item.data.gender == 'M') {
        return false;
      } else if (drop.id == 'double3List' || drop.id == 'double4List') {
        if (item.data.gender == 'M') {
          return drop.data.filter((r) => r.gender == 'M').length != 1;
        } else {
          return drop.data.filter((r) => r.gender == 'F').length != 1;
        }
      } else if (
        (drop.id == 'single1List' || drop.id == 'single2List') &&
        item.data.gender == 'F'
      ) {
        return false;
      } else if (
        (drop.id == 'single3List' || drop.id == 'single4List') &&
        item.data.gender == 'M'
      ) {
        return false;
      }
    }

    return true;
  };

  drop(event: CdkDragDrop<TeamPlayer[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      if (
        event.container.id == 'playerList' &&
        event.container.data?.map((r) => r.id).includes(event.item.data.id)
      ) {
        event.previousContainer.data.splice(event.previousIndex, 1);
        this.updatedAssembly$.next(true);
        return;
      }

      if (event.previousContainer.id == 'playerList') {
        const singles = [...this.single1, ...this.single2, ...this.single3, ...this.single4];
        const doubles = [...this.double1, ...this.double2, ...this.double3, ...this.double4];

        const singlesCount = singles.filter((p) => p.id === event.item.data.id).length;
        const doublesCount = doubles.filter((p) => p.id === event.item.data.id).length;
        if (
          singlesCount > 0 &&
          event.container.id.includes('single') &&
          !event.previousContainer.id.includes('single')
        ) {
          return;
        }

        if (doublesCount > 1 && event.container.id.includes('double')) {
          return;
        }

        copyArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      } else {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }

      if (event.container.id !== 'substitudeList') {
        this.substitutes = this.substitutes.filter((r) => r.id !== event.item.data.id);
      }
    }
    this.updatedAssembly$.next(true);
  }

  changeTeam() {
    this.dialog.open(EditDialogComponent, {
      data: {
        team: this.team,
      },

      width: '100%',
      maxWidth: '600px',
    });
  }

  onResized(event: ResizeResult) {
    this.notSmallScreen = event.width > 200;
  }

  private _getTeam(teamId: string, encounterId?: string) {
    return this._getRankingWhere(encounterId).pipe(
      distinctUntilChanged(),
      switchMap((where) =>
        this.apollo
          .watchQuery<{ team: Partial<Team> }>({
            query: gql`
              query TeamInfo($id: ID!, $rankingWhere: JSONObject, $lastRankginWhere: JSONObject) {
                team(id: $id) {
                  id
                  captainId
                  clubId
                  teamNumber
                  type
                  captainId
                  phone
                  email
                  season
                  preferredDay
                  preferredTime
                  players {
                    id
                    slug
                    fullName
                    gender
                    competitionPlayer
                    rankingLastPlaces(where: $lastRankginWhere) {
                      id
                      single
                      double
                      mix
                    }
                    rankingPlaces(where: $rankingWhere) {
                      id
                      rankingDate
                      single
                      double
                      mix
                    }
                    teamMembership {
                      id
                      membershipType
                      teamId
                    }
                  }
                  entry {
                    id
                    meta {
                      competition {
                        players {
                          id
                          levelException
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id: teamId,
              ...where,
            },
          })
          .valueChanges.pipe(
            transferState(`assemblyTeamKey-${teamId}`, this.stateTransfer, this.platformId),
            map((result) => {
              if (!result?.data.team) {
                throw new Error('No club');
              }

              return new Team(result.data.team);
            }),
          ),
      ),
    );
  }

  private _getRankingWhere(encounterId?: string) {
    if (!encounterId) {
      const usedRankingDate = moment();
      this.startRanking = usedRankingDate.clone().set('date', 0);
      this.endRanking = usedRankingDate.clone().clone().endOf('month');
      return of({
        rankingWhere: {
          rankingDate: {
            $between: [this.startRanking, this.endRanking],
          },
          systemId: this.systemService.systemId(),
        },
        lastRankginWhere: {
          systemId: this.systemService.systemId(),
        },
      });
    }

    // Combine _getEvent and _getEncounter
    return this._getEvent(encounterId).pipe(
      map((event) => {
        if (!event || !event.season || !event.usedRankingUnit || !event.usedRankingAmount) {
          throw new Error('No event');
        }

        const usedRankingDate = moment();
        usedRankingDate.set('year', event.season);
        usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

        this.startRanking = usedRankingDate.clone().set('date', 0);
        this.endRanking = usedRankingDate.clone().clone().endOf('month');

        return {
          rankingWhere: {
            rankingDate: {
              $between: [this.startRanking, this.endRanking],
            },
            systemId: this.systemService.systemId(),
          },
          lastRankginWhere: {
            systemId: this.systemService.systemId(),
          },
        };
      }),
      shareReplay(1),
    );
  }

  private _getEvent(encounterCompetitionId: string) {
    return this.apollo
      .query<{ encounterCompetition: Partial<EncounterCompetition> }>({
        query: gql`
          query EncounterCompetition($encounterCompetitionId: ID!) {
            encounterCompetition(id: $encounterCompetitionId) {
              id
              drawCompetition {
                id
                subEventCompetition {
                  id
                  eventCompetition {
                    id
                    season
                    usedRankingUnit
                    usedRankingAmount
                  }
                }
              }
            }
          }
        `,
        variables: {
          encounterCompetitionId,
        },
      })
      .pipe(
        transferState(
          `eventForEncounter-${encounterCompetitionId}`,
          this.stateTransfer,
          this.platformId,
        ),
        map((result) => result?.data.encounterCompetition?.drawCompetition?.subEventCompetition),
        map((result) => {
          if (!result?.eventCompetition) {
            throw new Error('No event');
          }

          return new EventCompetition(result?.eventCompetition);
        }),
      );
  }

  private _checkAssembly() {
    return this.apollo
      .query<{ assemblyValidation: ValidationResult }>({
        query: gql`
          query AssemblyValidation($assembly: AssemblyInput!) {
            assemblyValidation(assembly: $assembly) {
              baseTeamIndex
              baseTeamPlayers {
                id
                fullName
                single
                double
                mix
              }

              titularsIndex
              titularsPlayers {
                id
                fullName
                single
                double
                mix
              }
              valid

              errors {
                params
                message
              }
              warnings {
                params
                message
              }
            }
          }
        `,
        variables: {
          assembly: {
            captainId: this.group().get('captain')?.value,
            teamId: this.group().get('team')?.value,
            encounterId: this.group().get('encounter')?.value,

            single1: this.group().get('single1')?.value?.id,
            single2: this.group().get('single2')?.value?.id,
            single3: this.group().get('single3')?.value?.id,
            single4: this.group().get('single4')?.value?.id,

            double1: this.group()
              .get('double1')
              ?.value?.map((r: Player) => r.id),
            double2: this.group()
              .get('double2')
              ?.value?.map((r: Player) => r.id),
            double3: this.group()
              .get('double3')
              ?.value?.map((r: Player) => r.id),
            double4: this.group()
              .get('double4')
              ?.value?.map((r: Player) => r.id),

            subtitudes: this.group()
              .get('subtitudes')
              ?.value?.map((r: Player) => r.id),
          },
        },
      })
      .pipe(
        map((result) => {
          if (!result.data.assemblyValidation) {
            throw new Error('No assemblyValidation');
          }

          return result.data.assemblyValidation;
        }),
      );
  }

  private _sortLists() {
    const sortList = (a: Player, b: Player) => {
      if (a.gender != b.gender) {
        return a.gender == 'F' ? -1 : 1;
      }

      const playerA =
        (a.lastRanking?.single ?? 12) +
        (a.lastRanking?.double ?? 12) +
        (this.type() == 'MX' ? a.lastRanking?.mix ?? 12 : 12);

      const playerB =
        (b.lastRanking?.single ?? 12) +
        (b.lastRanking?.double ?? 12) +
        (this.type() == 'MX' ? b.lastRanking?.mix ?? 12 : 12);

      // If the same return single
      if (playerA == playerB) {
        return a.lastRanking?.single ?? 12 - (b.lastRanking?.single ?? 12);
      }

      return playerA - playerB;
    };

    const sortDouble = (a: Player, b: Player) => {
      const playerA = a.lastRanking?.double ?? 12;
      const playerB = b.lastRanking?.double ?? 12;

      return playerA - playerB;
    };

    const sortMix = (a: Player, b: Player) => {
      if (a.gender == b.gender) {
        return sortDouble(a, b);
      } else {
        return a.gender == 'F' ? -1 : 1;
      }
    };

    this.players?.REGULAR.sort(sortList);
    this.players?.REGULAR.sort(sortList);
    this.substitutes.sort(sortList);

    this.double1 = this.double1.sort(sortDouble);
    this.double2 = this.double2.sort(sortDouble);

    if (this.type() == 'MX') {
      this.double3 = this.double3.sort(sortMix);
      this.double4 = this.double4.sort(sortMix);
    } else {
      this.double3 = this.double3.sort(sortDouble);
      this.double4 = this.double4.sort(sortDouble);
    }
  }

  private _setTranslations() {
    if (this.type() == 'M') {
      this.captionSingle1Prefix = 'all.gender.males';
      this.captionSingle2Prefix = 'all.gender.males';
      this.captionSingle3Prefix = 'all.gender.males';
      this.captionSingle4Prefix = 'all.gender.males';
      this.captionDouble1Prefix = 'all.gender.males';
      this.captionDouble2Prefix = 'all.gender.males';
      this.captionDouble3Prefix = 'all.gender.males';
      this.captionDouble4Prefix = 'all.gender.males';

      this.captionDouble1 = `all.competition.team-assembly.double1`;
      this.captionDouble2 = `all.competition.team-assembly.double2`;
      this.captionDouble3 = `all.competition.team-assembly.double3`;
      this.captionDouble4 = `all.competition.team-assembly.double4`;

      this.captionSingle1 = 'all.competition.team-assembly.single1';
      this.captionSingle2 = 'all.competition.team-assembly.single2';
      this.captionSingle3 = 'all.competition.team-assembly.single3';
      this.captionSingle4 = 'all.competition.team-assembly.single4';
    } else if (this.type() == 'F') {
      this.captionSingle1Prefix = 'all.gender.females';
      this.captionSingle2Prefix = 'all.gender.females';
      this.captionSingle3Prefix = 'all.gender.females';
      this.captionSingle4Prefix = 'all.gender.females';
      this.captionDouble1Prefix = 'all.gender.females';
      this.captionDouble2Prefix = 'all.gender.females';
      this.captionDouble3Prefix = 'all.gender.females';
      this.captionDouble4Prefix = 'all.gender.females';

      this.captionDouble1 = `all.competition.team-assembly.double1`;
      this.captionDouble2 = `all.competition.team-assembly.double2`;
      this.captionDouble3 = `all.competition.team-assembly.double3`;
      this.captionDouble4 = `all.competition.team-assembly.double4`;

      this.captionSingle1 = 'all.competition.team-assembly.single1';
      this.captionSingle2 = 'all.competition.team-assembly.single2';
      this.captionSingle3 = 'all.competition.team-assembly.single3';
      this.captionSingle4 = 'all.competition.team-assembly.single4';
    } else {
      this.captionDouble1Prefix = '';
      this.captionDouble2Prefix = '';
      this.captionDouble3Prefix = '';
      this.captionDouble4Prefix = '';

      this.captionSingle1Prefix = 'all.gender.males';
      this.captionSingle2Prefix = 'all.gender.males';

      this.captionSingle3Prefix = 'all.gender.females';
      this.captionSingle4Prefix = 'all.gender.females';

      this.captionSingle1 = 'all.competition.team-assembly.single1';
      this.captionSingle2 = 'all.competition.team-assembly.single2';
      this.captionSingle3 = 'all.competition.team-assembly.single1';
      this.captionSingle4 = 'all.competition.team-assembly.single2';

      this.captionDouble1 = `all.competition.team-assembly.mix1`;
      this.captionDouble2 = `all.competition.team-assembly.mix2`;
      this.captionDouble3 = `all.competition.team-assembly.mix3`;
      this.captionDouble4 = `all.competition.team-assembly.mix4`;
    }
  }

  validatePlayer = (player: Player) => {
    if (this.players?.REGULAR?.find((p) => p.id === player.id)) {
      return {
        valid: false,
        message: 'all.player.search.in-list',
      };
    }

    if (this.players?.BACKUP?.find((p) => p.id === player.id)) {
      return {
        valid: false,
        message: 'all.player.search.backup-player',
      };
    }

    return {
      valid: true,
    };
  };

  private _loadSaved(encounterId?: string, captainId?: string) {
    if (!this.authenticateService.loggedIn || !encounterId) {
      return of([]);
    }

    return this.apollo
      .query<{ encounterCompetition: Partial<EncounterCompetition> }>({
        query: SAVED_ASSEMBLY,
        variables: {
          id: encounterId,
          where: {
            captainId,
            playerId: this.authenticateService?.user()?.id,
          },
        },
      })
      .pipe(
        transferState(`savedAssembly-${encounterId}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data?.encounterCompetition) {
            throw new Error('No encounterCompetition');
          }
          return result.data.encounterCompetition?.assemblies?.map(
            (assembly) => new Assembly(assembly),
          );
        }),
      );
  }

  private _getPlayers(ids: string[]) {
    return ids
      ?.map((id) => this.players?.REGULAR.concat(this.players.REGULAR)?.find((x) => x?.id === id))
      ?.filter((x) => x != null) as TeamPlayer[];
  }
}
