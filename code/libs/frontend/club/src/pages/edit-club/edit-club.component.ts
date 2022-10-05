import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import {
  Club,
  EventCompetition,
  Location,
  Player,
  Role,
  Team,
} from '@badman/frontend/models';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
} from 'rxjs';
import { debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { LocationDialogComponent } from '../../dialogs';
import { apolloCache } from '@badman/frontend/graphql';

@Component({
  templateUrl: './edit-club.component.html',
  styleUrls: ['./edit-club.component.scss'],
})
export class EditClubComponent implements OnInit {
  club$!: Observable<Club>;
  roles$!: Observable<Role[]>;
  locations$!: Observable<Location[]>;

  compYears$?: Observable<(number | undefined)[]>;
  teamsForYear$!: Observable<Team[]>;

  updateClub$ = new BehaviorSubject(null);
  updateLocation$ = new BehaviorSubject(null);
  updateRoles$ = new BehaviorSubject(null);

  competitionYear = new FormControl();

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    const clubid$ = this.route.paramMap.pipe(map((params) => params.get('id')));

    this.compYears$ = combineLatest([
      clubid$,
      this.updateClub$.pipe(debounceTime(600)),
    ]).pipe(
      switchMap(([id]) => {
        if (!id) {
          throw new Error('No club id');
        }

        return this.apollo
          .query<{ club: Club }>({
            query: gql`
              query GetCompYearsQuery($id: ID!) {
                club(id: $id) {
                  id
                  teams {
                    id
                    slug
                    name
                    clubId
                    entries {
                      id
                      competitionSubEvent {
                        id
                        eventCompetition {
                          id
                          startYear
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id,
            },
          })
          .pipe(
            map(
              (x) =>
                x.data.club.teams
                  ?.map((r) =>
                    r.entries?.map(
                      (r) => r.competitionSubEvent?.eventCompetition?.startYear
                    )
                  )
                  .flat()
                  .filter((x, i, a) => a.indexOf(x) === i)
                  .sort() ?? []
            )
          );
      })
    );

    const query = combineLatest([
      clubid$,
      this.updateClub$,
      this.updateRoles$,
      this.updateLocation$,
    ]).pipe(
      debounceTime(600),
      switchMap(([id]) =>
        this.apollo.query<{ club: Club }>({
          query: gql`
            query GetClub($id: ID!) {
              club(id: $id) {
                id
                slug
                name
                fullName
                useForTeamName
                abbreviation
                clubId
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
          variables: { id },
        })
      ),
      map((result) => result.data.club),
      map((club) => new Club(club))
    );

    this.teamsForYear$ = combineLatest([
      clubid$,
      this.competitionYear.valueChanges,
      this.updateClub$.pipe(debounceTime(600)),
    ]).pipe(
      switchMap(([clubId, year, update]) => {
        return this.apollo
          .query<{ eventCompetitions: { rows: EventCompetition[] } }>({
            query: gql`
              query GetSubevents($year: Int!) {
                eventCompetitions(where: { startYear: $year }) {
                  rows {
                    id
                    subEventCompetitions {
                      id
                    }
                  }
                }
              }
            `,
            variables: {
              year: year || undefined,
            },
          })
          .pipe(
            map((events) => {
              return [
                clubId,
                year,
                update,
                events.data.eventCompetitions?.rows.flatMap((event) =>
                  event?.subEventCompetitions?.flatMap((s) => s.id)
                ),
              ];
            })
          );
      }),
      switchMap(([clubId, , , subEvents]) => {
        return this.apollo
          .query<{ club: Club }>({
            query: gql`
              query GetBasePlayersQuery($id: ID!, $subEventsWhere: JSONObject) {
                id
                teams {
                  id
                  name
                  clubId
                  type
                  entries(where: $subEventsWhere) {
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
            `,
            variables: {
              id: clubId,
              subEventsWhere: {
                subEventId: subEvents,
              },
            },
          })
          .pipe(
            map((x) => {
              return (
                x.data.club.teams?.filter(
                  (r) =>
                    (r.entries?.length ?? 0) > 0 &&
                    (r.entries?.[0].meta?.competition != null ||
                      r.entries?.[0].meta?.tournament != null)
                ) ?? []
              );
            })
          );
      })
    );

    this.club$ = query.pipe(
      tap((club) => this.titleService.setTitle(`Edit ${club.name}`))
    );
    this.locations$ = query.pipe(map((club) => club.locations ?? []));
    this.roles$ = query.pipe(map((club) => club.roles ?? []));
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
    this._snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }

  // TODO: Check if this is still used
  // async onPlayerUpdatedFromTeam(player: Player, team: Team) {
  //   if (player && team) {
  //     await lastValueFrom(this.teamService.updatePlayer(team, player));
  //     this._snackBar.open('Player updated', undefined, {
  //       duration: 1000,
  //       panelClass: 'success',
  //     });
  //     this._deleteTeamFromCache(team.id);
  //     this.updateClub$.next(null);
  //   }
  // }

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
      this._snackBar.open('Player added', undefined, {
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
      this._snackBar.open('Player removed', undefined, {
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

    if (!team.entries?.[0].competitionSubEvent?.id) {
      throw new Error('No sub event id');
    }

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation AddBasePlayer(
            $playerId: ID!
            $subEventId: ID!
            $teamId: ID!
          ) {
            addBasePlayer(
              playerId: $playerId
              subEventId: $subEventId
              teamId: $teamId
            )
          }
        `,
        variables: {
          playerId: player.id,
          subEventId: team.entries[0].competitionSubEvent.id,
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

    if (!team.entries?.[0].competitionSubEvent?.id) {
      throw new Error('No sub event id');
    }

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation DeleteBasePlayer(
            $playerId: ID!
            $subEventId: ID!
            $teamId: ID!
          ) {
            deleteBasePlayer(
              playerId: $playerId
              subEventId: $subEventId
              teamId: $teamId
            )
          }
        `,
        variables: {
          playerId: player.id,
          subEventId: team.entries[0].competitionSubEvent.id,
          teamId: team.id,
        },
      })
    );
    this._deleteTeamFromCache(team.id);
    this.updateClub$.next(null);
  }

  private _deleteRoleFromCache(role?: string) {
    const normalizedAvailibility = apolloCache.identify({
      id: role,
      __typename: 'Role',
    });
    apolloCache.evict({ id: normalizedAvailibility });
    apolloCache.gc();
  }

  private _deleteTeamFromCache(teamId?: string) {
    const normalizedAvailibility = apolloCache.identify({
      id: teamId,
      __typename: 'Team',
    });
    apolloCache.evict({ id: normalizedAvailibility });
    apolloCache.gc();
  }
}
