import { CommonModule, isPlatformServer } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { InMemoryCache } from '@apollo/client/cache';
import { HasClaimComponent } from '@badman/frontend-components';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import { Club, Location, Player, Role, Team } from '@badman/frontend-models';
import { getCurrentSeason, sortTeams } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { BehaviorSubject, lastValueFrom, Observable, of, Subject } from 'rxjs';
import { map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ClubFieldsComponent } from '../../components';
import { LocationDialogComponent } from '../../dialogs';
import {
  ClubEditLocationComponent,
  ClubEditRoleComponent,
  ClubEditTeamComponent,
} from './components';

@Component({
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
    ClubEditRoleComponent,
    ClubEditTeamComponent,
    HasClaimComponent,
    ClubFieldsComponent,

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
  ],
})
export class EditPageComponent implements OnInit, OnDestroy {
  club!: Club;

  destroy$ = new Subject<void>();

  roles$!: Observable<Role[]>;
  locations$!: Observable<Location[]>;

  teamsForYear$!: Observable<Team[]>;

  updateClub$ = new BehaviorSubject(null);
  updateLocation$ = new BehaviorSubject(null);
  updateRoles$ = new BehaviorSubject(null);

  competitionYear = new FormControl();

  seasons = [getCurrentSeason()];

  constructor(
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private apollo: Apollo,
    @Inject(APOLLO_CACHE) private cache: InMemoryCache,
    private route: ActivatedRoute,
    private transferState: TransferState,
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

      this.roles$ = this.updateClub$.pipe(
        takeUntil(this.destroy$),
        switchMap(() => this._loadRoles())
      );
      this.locations$ = this.updateLocation$.pipe(
        takeUntil(this.destroy$),
        switchMap(() => this._loadLocations())
      );
      
      this._getYears().then((years) => {
        if (years.length > 0) {
          this.seasons = years;
        }
      });

      this.teamsForYear$ = this.competitionYear.valueChanges.pipe(
        takeUntil(this.destroy$),
        switchMap((season) => {
          return this.apollo.query<{ club: Club }>({
            fetchPolicy: 'network-only',
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
                    entry {
                      id
                      competitionSubEvent {
                        id
                      }
                      meta {
                        competition {
                          teamIndex
                          players {
                            id
                            single
                            double
                            mix
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
          console.log(teams);
        }),
        map((teams) => teams.sort(sortTeams))
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _loadRoles() {
    const STATE_KEY = makeStateKey<Role[]>('clubRolesKey-' + this.club.id);

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((role) => new Role(role)));
    }

    return this.apollo
      .query<{ club: Partial<Club> }>({
        query: gql`
          query GetClubRoles($id: ID!) {
            club(id: $id) {
              id
              roles {
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
          }
        `,
        variables: {
          id: this.club.id,
        },
      })
      .pipe(
        map((result) => {
          if (!result.data.club) {
            throw new Error('No club');
          }

          if (!result.data.club.roles) {
            throw new Error('No roles');
          }

          return result.data.club.roles.map((roles) => new Role(roles));
        }),
        tap((roles) => {
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(STATE_KEY, roles);
          }
        })
      );
  }

  private _loadLocations() {
    const STATE_KEY = makeStateKey<Location[]>(
      'clubLocationsKey-' + this.club.id
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((location) => new Location(location)));
    }

    return this.apollo
      .query<{ club: Partial<Club> }>({
        query: gql`
          query GetClubLocations($id: ID!) {
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
              }
            }
          }
        `,
        variables: {
          id: this.club.id,
        },
      })
      .pipe(
        map((result) => {
          if (!result.data.club) {
            throw new Error('No club');
          }

          if (!result.data.club.locations) {
            throw new Error('No locations');
          }

          return result.data.club.locations.map(
            (location) => new Location(location)
          );
        }),
        tap((locations) => {
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(STATE_KEY, locations);
          }
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

  async onPlayerAddedToRole(player: Player, role: Role) {
    if (player && role) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation AddPlayerToRole($playerId: ID!, $roleId: ID!) {
              addPlayerToRole(playerId: $playerId, roleId: $roleId)
            }
          `,
          variables: {
            playerId: player.id,
            roleId: role.id,
          },
        })
      );
      this.snackBar.open('Player added', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this._deleteRoleFromCache(role.id);
      this.updateRoles$.next(null);
    }
  }

  async onPlayerRemovedFromRole(player: Player, role: Role) {
    if (player && role) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromRole($playerId: ID!, $roleId: ID!) {
              removePlayerFromRole(playerId: $playerId, roleId: $roleId)
            }
          `,
          variables: {
            playerId: player.id,
            roleId: role.id,
          },
        })
      );
      this.snackBar.open('Player removed', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this._deleteRoleFromCache(role.id);
      this.updateRoles$.next(null);
    }
  }

  async onEditRole(role: Role) {
    this.router.navigate(['role', role.id], { relativeTo: this.route });
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
    this.updateRoles$.next(null);
  }

  async onAddBasePlayer(player: Partial<Player>, team: Team) {
    if (!team?.id) {
      throw new Error('No team id');
    }
    if (!player?.id) {
      throw new Error('No player id');
    }

    if (!team.entry?.competitionSubEvent?.id) {
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
          subEventId: team.entry.competitionSubEvent.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateClub$.next(null);
  }

  async onDeleteBasePlayer(player: Partial<Player>, team: Team) {
    if (!team?.id) {
      throw new Error('No team id');
    }
    if (!player?.id) {
      throw new Error('No player id');
    }

    if (!team.entry?.competitionSubEvent?.id) {
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
          subEventId: team.entry.competitionSubEvent.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateClub$.next(null);
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