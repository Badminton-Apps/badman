import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TemplateRef,
  TransferState,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';

import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InMemoryCache } from '@apollo/client/cache';
import {
  AddRoleComponent,
  EditRoleComponent,
  HasClaimComponent,
  SelectCountryComponent,
  SelectCountrystateComponent,
} from '@badman/frontend-components';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import {
  Availability,
  Club,
  EntryCompetitionPlayer,
  Location,
  Player,
  Role,
  Team,
} from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import {
  SecurityType,
  SubEventType,
  SubEventTypeEnum,
  UseForTeamName,
  getCurrentSeason,
  sortTeams,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  lastValueFrom,
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  skip,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ClubFieldsComponent } from '../../components';
import { LocationDialogComponent } from '../../dialogs';
import { ClubEditLocationComponent, ClubEditTeamComponent } from './components';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'badman-club-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,

    // Other modules
    MomentModule,
    TranslateModule,

    // My Modules
    ClubEditLocationComponent,
    ClubEditTeamComponent,
    ClubFieldsComponent,
    HasClaimComponent,
    SelectCountryComponent,
    SelectCountrystateComponent,
    EditRoleComponent,
    AddRoleComponent,

    // Material Modules
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatOptionModule,
    MatSelectModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
})
export class EditPageComponent implements OnInit, OnDestroy {
  public securityTypes: typeof SecurityType = SecurityType;

  club!: Club;

  destroy$ = new Subject<void>();

  roles$!: Observable<Role[]>;
  locations$!: Observable<Location[]>;

  teamsForSeason$!: Observable<Team[]>;
  locationForSeason$!: Observable<Location[]>;

  updateClub$ = new BehaviorSubject(null);
  updateLocation$ = new BehaviorSubject(null);
  updateRoles$ = new BehaviorSubject(true);
  updateTeams$ = new BehaviorSubject(null);

  season = new FormControl();
  newTeamForm?: FormGroup;
  clubGroup?: FormGroup<{
    id: FormControl<string>;
    name: FormControl<string>;
    clubId: FormControl<string>;
    fullName: FormControl<string>;
    abbreviation: FormControl<string>;
    useForTeamName: FormControl<UseForTeamName>;
    country: FormControl<string>;
    state: FormControl<string>;
  }>;

  seasons = [getCurrentSeason()];

  eventTypes = Object.values(SubEventTypeEnum);
  selectNumbers: number[] = [];
  teamNumbers: {
    [key in SubEventType]: number[];
  } = {
    F: [],
    M: [],
    MX: [],
    NATIONAL: [],
  };

  // template ref for adding new team
  @ViewChild('newTeamTemplate', { static: true })
  teamTemplate?: TemplateRef<HTMLElement>;

  constructor(
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private apollo: Apollo,
    @Inject(APOLLO_CACHE) private cache: InMemoryCache,
    private route: ActivatedRoute,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.club = data['club'];
      const clubName = `${this.club.name}`;

      this.seoService.update({
        title: clubName,
        description: `Edit club ${clubName}`,
        type: 'website',
        keywords: ['club', 'badminton'],
      });
      this.breadcrumbsService.set('@club', clubName);

      this.clubGroup = new FormGroup({
        id: new FormControl(this.club.id, [Validators.required]),
        name: new FormControl(this.club.name, [Validators.required]),
        clubId: new FormControl(this.club.clubId, [Validators.required]),
        fullName: new FormControl(this.club.fullName, [Validators.required]),
        abbreviation: new FormControl(this.club.abbreviation, [
          Validators.required,
        ]),
        useForTeamName: new FormControl(this.club.useForTeamName, [
          Validators.required,
        ]),
        country: new FormControl(this.club.country, [Validators.required]),
        state: new FormControl(this.club.state, [Validators.required]),
      }) as FormGroup<{
        id: FormControl<string>;
        name: FormControl<string>;
        clubId: FormControl<string>;
        fullName: FormControl<string>;
        abbreviation: FormControl<string>;
        useForTeamName: FormControl<UseForTeamName>;
        country: FormControl<string>;
        state: FormControl<string>;
      }>;

      this.clubGroup.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(500),
          distinctUntilChanged(),
          skip(1),
          filter(() => this.clubGroup?.valid ?? false)
        )
        .subscribe((value) => {
          this.save(value as Club);
        });

      this.roles$ = combineLatest([this.updateClub$, this.updateRoles$]).pipe(
        takeUntil(this.destroy$),
        switchMap(([, useCache]) => this._loadRoles(useCache))
      );

      this._getYears().then((years) => {
        if (years.length > 0) {
          this.seasons = years;
          this.season.setValue(getCurrentSeason());
        }
      });

      this.teamsForSeason$ = combineLatest([
        this.season.valueChanges,
        this.updateTeams$,
      ]).pipe(
        takeUntil(this.destroy$),
        switchMap((season) => {
          return this.apollo.query<{ club: Club }>({
            fetchPolicy: 'no-cache',
            query: gql`
              query GetBasePlayersQuery($id: ID!, $where: JSONObject!) {
                club(id: $id) {
                  id
                  teams(where: $where) {
                    id
                    name
                    clubId
                    type
                    teamNumber
                    season
                    entry {
                      id
                      subEventCompetition {
                        id
                        name
                        eventCompetition {
                          id
                          name
                        }
                      }
                      meta {
                        competition {
                          teamIndex
                          players {
                            id
                            single
                            double
                            mix
                            levelException
                            player {
                              id
                              slug
                              fullName
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
              id: this.club.id,
              where: {
                season: season,
              },
            },
          });
        }),
        map((x) => {
          return (x.data.club.teams ?? []).map((t) => new Team(t));
        }),
        tap((teams) => {
          // initial teamnumbers from 1 to maxlevel
          for (const type of this.eventTypes) {
            const maxLevelM = Math.max(
              ...(teams
                ?.filter((t) => t.type === type)
                .map((t) => t.teamNumber ?? 0) ?? [])
            );
            this.teamNumbers[type] = Array.from(
              { length: maxLevelM },
              (_, i) => i + 1
            );
          }
        }),
        map((teams) => teams.sort(sortTeams))
      );

      this.locationForSeason$ = combineLatest([
        this.season.valueChanges,
        this.updateLocation$,
      ]).pipe(
        takeUntil(this.destroy$),
        switchMap((season) => {
          return this.apollo.query<{ club: Club }>({
            fetchPolicy: 'no-cache',
            query: gql`
              query GetAvailibiltiesForSeason($id: ID!, $where: JSONObject!) {
                club(id: $id) {
                  id
                  locations {
                    id
                    name
                    address
                    postalcode
                    street
                    streetNumber
                    city
                    state
                    phone
                    fax
                    availibilities(where: $where) {
                      id
                      season
                      days {
                        day
                        startTime
                        endTime
                        courts
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
              id: this.club.id,
              where: {
                season: season,
              },
            },
          });
        }),
        map((x) => {
          return (x.data.club.locations ?? []).map((t) => new Location(t));
        }),
        // filter locations that don't have any availabilities
        map((locations) => locations.filter((l) => l.availibilities.length > 0))
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _loadRoles(useCache = true) {
    return this.apollo
      .query<{ roles: Role[] }>({
        fetchPolicy: useCache ? 'cache-first' : 'network-only',
        query: gql`
          query GetClubRoles($where: JSONObject) {
            roles(where: $where) {
              id
              name
              players {
                slug
                id
                firstName
                lastName
              }
            }
          }
        `,
        variables: {
          where: {
            linkId: this.club.id,
            linkType: 'club',
          },
        },
      })
      .pipe(
        transferState(
          `clubRolesKey-${this.club.id}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.roles) {
            throw new Error('No roles');
          }

          return result.data.roles.map((roles) => new Role(roles));
        })
      );
  }

  private _getYears() {
    return lastValueFrom(
      this.apollo
        .query<{
          teams: Partial<Team[]>;
        }>({
          query: gql`
            query CompetitionYears($where: JSONObject) {
              teams(where: $where) {
                id
                season
              }
            }
          `,
          variables: {
            where: {
              clubId: this.club.id,
            },
          },
        })
        .pipe(
          map((result) => {
            if (!result.data.teams) {
              throw new Error('No teams');
            }
            return result.data.teams.map((row) => row?.season as number);
          }),
          // map distinct years
          map((years) => [...new Set(years)]),
          // sort years
          map((years) => years.sort((a, b) => b - a))
        )
    );
  }

  async save(club: Club) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation UpdateClub($data: ClubUpdateInput!) {
            updateClub(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: club,
        },
      })
    );
    this.snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }

  async onEditLocation(location?: Location, club?: Club) {
    const dialogRef = this.dialog.open(LocationDialogComponent, {
      data: { location, club, compYears: [2022, 2021, 2020] },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe(() => {
      this.updateLocation$.next(null);
    });
  }

  async onDeleteLocation(location: Location) {
    if (!location?.id) {
      throw new Error('No location id');
    }
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation DeleteLocation($id: ID!) {
            deleteLocation(id: $id)
          }
        `,
        variables: { id: location.id },
      })
    );

    this.updateLocation$.next(null);
  }

  async addRole() {
    this.updateRoles$.next(false);
  }

  async addTeam() {
    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.AddDialogComponent, {
          data: {
            team: {
              clubId: this.club.id,
              season: this.season.value,
            },
            teamNumbers: this.teamNumbers,
          },

          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.updateTeams$.next(null);
        });
    });
  }

  async onDeleteRole(role: Role) {
    if (!role?.id) {
      throw new Error('No location id');
    }
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation DeleteRole($id: ID!) {
            deleteRole(id: $id)
          }
        `,
        variables: { id: role.id },
      })
    );
    this._deleteRoleFromCache(role.id);
    this.updateRoles$.next(false);
  }

  async onAddBasePlayer(player: Partial<EntryCompetitionPlayer>, team: Team) {
    if (!team?.id) {
      throw new Error('No team id');
    }
    if (!player?.id) {
      throw new Error('No player id');
    }

    if (!team.entry?.subEventCompetition?.id) {
      throw new Error('No sub event id');
    }

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation AddBasePlayerForSubEvent(
            $playerId: ID!
            $subEventId: ID!
            $teamId: ID!
          ) {
            addBasePlayerForSubEvent(
              playerId: $playerId
              subEventId: $subEventId
              teamId: $teamId
            ) {
              id
            }
          }
        `,
        variables: {
          playerId: player.id,
          subEventId: team.entry.subEventCompetition.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateTeams$.next(null);
  }

  async onDeleteBasePlayer(
    player: Partial<EntryCompetitionPlayer>,
    team: Team
  ) {
    if (!team?.id) {
      throw new Error('No team id');
    }
    if (!player?.id) {
      throw new Error('No player id');
    }

    if (!team.entry?.subEventCompetition?.id) {
      throw new Error('No sub event id');
    }

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation removeBasePlayerForSubEvent(
            $playerId: ID!
            $subEventId: ID!
            $teamId: ID!
          ) {
            removeBasePlayerForSubEvent(
              playerId: $playerId
              subEventId: $subEventId
              teamId: $teamId
            ) {
              id
            }
          }
        `,
        variables: {
          playerId: player.id,
          subEventId: team.entry.subEventCompetition.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateTeams$.next(null);
  }

  async onPlayerMetaUpdated(
    player: Partial<EntryCompetitionPlayer>,
    team: Team
  ) {
    if (!team?.id) {
      throw new Error('No team id');
    }
    if (!player?.id) {
      throw new Error('No player id');
    }

    if (!team.entry?.subEventCompetition?.id) {
      throw new Error('No sub event id');
    }

    // delete __typename from player

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation UpdatePlayerMetaForSubEvent(
            $teamId: ID!
            $subEventId: ID!
            $player: EntryCompetitionPlayersInputType!
          ) {
            updatePlayerMetaForSubEvent(
              teamId: $teamId
              subEventId: $subEventId
              player: $player
            ) {
              id
            }
          }
        `,
        variables: {
          player: {
            id: player.id,
            single: player.single,
            double: player.double,
            mix: player.mix,
            levelException: player.levelException,
          },
          subEventId: team.entry.subEventCompetition.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateTeams$.next(null);
  }

  async onSubEventAssignedToTeam(
    event: {
      event: string;
      subEvent: string;
    },
    team: Team
  ) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation Mutation($teamId: String!, $subEventId: String!) {
            createEnrollment(teamId: $teamId, subEventId: $subEventId)
          }
        `,
        variables: {
          teamId: team.id,
          subEventId: event.subEvent,
        },
      })
      .subscribe(() => {
        this._deleteTeamFromCache(team.id);
        this.updateTeams$.next(null);
      });
  }

  private _deleteRoleFromCache(role?: string) {
    const normalizedAvailibility = this.cache.identify({
      id: role,
      __typename: 'Role',
    });
    this.cache.evict({ id: normalizedAvailibility });
    this.cache.gc();
  }

  private _deleteTeamFromCache(teamId?: string) {
    const normalizedAvailibility = this.cache.identify({
      id: teamId,
      __typename: 'Team',
    });
    this.cache.evict({ id: normalizedAvailibility });
    this.cache.gc();
  }
}
