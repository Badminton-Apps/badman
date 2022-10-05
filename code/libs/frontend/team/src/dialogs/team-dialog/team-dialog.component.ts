import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { apolloCache } from '@badman/frontend/graphql';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
  of,
} from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Club, Player, Team, Location } from '@badman/frontend/models';

import { ClaimService } from '@badman/frontend/authentication';
import { SystemService } from '@badman/frontend/ranking';

@Component({
  templateUrl: './team-dialog.component.html',
  styleUrls: ['./team-dialog.component.scss'],
})
export class TeamDialogComponent implements OnInit {
  team$!: Observable<Team>;
  locations$!: Observable<Location[]>;
  alreadyUsed$!: Observable<string[]>;

  update$ = new BehaviorSubject(0);

  form!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { team: Team; club: Club; allowEditType: boolean },
    private systemService: SystemService,
    private apollo: Apollo,
    private auth: ClaimService
  ) {}

  ngOnInit(): void {
    this.team$ = combineLatest([
      this.auth.hasAnyClaims$([
        'details-any:team',
        this.data.club.id + '_details:team',
      ]),
      this.update$.pipe(startWith(-1)),
    ]).pipe(
      switchMap(([canViewPersonalData, u]) => {
        if (u >= 0 && this.data.team?.id) {
          // Evict cache
          this.evictCache();
        }
        if (this.data.team?.id) {
          return this.systemService
            .getPrimarySystemId()
            .pipe(
              switchMap((systemId) =>
                this.apollo.query<{ team: Team }>({
                  query: gql`
                    query GetTeamQuery(
                      $id: ID!
                      $personal: Boolean!
                      $systemId: ID!
                    ) {
                      team(id: $id) {
                        id
                        name
                        teamNumber
                        abbreviation
                        type
                        preferredTime
                        preferredDay
                        active
                        phone @include(if: $personal)
                        email @include(if: $personal)
                        captain {
                          id
                          fullName
                        }
                        locations {
                          id
                          name
                        }
                        players {
                          id
                          slug
                          firstName
                          lastName
                          competitionPlayer
                          base
                          gender
                          rankingLastPlaces(
                            take: 1
                            where: { systemId: $systemId }
                          ) {
                            id
                            single
                            double
                            mix
                          }
                        }
                      }
                    }
                  `,
                  variables: {
                    id: this.data.team?.id,
                    personal: canViewPersonalData,
                    systemId: systemId,
                  },
                })
              )
            )
            .pipe(map((x) => new Team(x.data.team)));
        } else {
          return of(null);
        }
      }),
      map((t) => t ?? new Team())
    );

    if (this.data.club) {
      this.alreadyUsed$ = this.team$.pipe(
        map((team) => {
          return (
            this.data.club.teams
              ?.filter(
                (t) => t.type == team?.type && t.id != team?.id && t.active
              )
              ?.map(
                (t) =>
                  (t.players.filter((p) => p.base).map((p) => p.id) ??
                    []) as string[]
              )
              ?.flat() ?? []
          );
        }),
        startWith([])
      );
    }

    this.form = new FormGroup({});
  }

  private evictCache() {
    const normalizedAvailibility = apolloCache.identify({
      id: this.data.team.id,
      __typename: 'Team',
    });
    apolloCache.evict({ id: normalizedAvailibility });
    apolloCache.gc();
  }

  async onPlayerAddedToTeam(player: Player, team: Team) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation AddPlayerToTeamMutation($playerId: ID!, $teamId: ID!) {
              addPlayerToTeam(playerId: $playerId, teamId: $teamId)
            }
          `,
          variables: {
            playerId: player.id,
            teamId: team.id,
          },
        })
      );

      this.update$.next(0);
    }
  }

  async onPlayerRemovedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromTeamMutation(
              $playerId: ID!
              $teamId: ID!
            ) {
              removePlayerFromTeam(playerId: $playerId, teamId: $teamId)
            }
          `,
          variables: {
            playerId: player.id,
            teamId: team.id,
          },
        })
      );
      this.update$.next(0);
    }
  }

  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation UpdatePlayerFromTeamMutation(
              $playerId: ID!
              $teamId: ID!
              $base: Boolean!
            ) {
              updatePlayerFromTeam(
                playerId: $playerId
                teamId: $teamId
                base: $base
              )
            }
          `,
          variables: {
            playerId: player.id,
            teamId: team.id,
            base: player.base,
          },
        })
      );
      this.update$.next(0);
    }
  }

  async teamAdded(team: Partial<Team>) {
    if (!this.data.club?.id) {
      throw new Error('No club id');
    }

    const newTeam = await lastValueFrom(
      this.apollo
        .mutate<{ createTeam: Partial<Team> }>({
          mutation: gql`
            mutation AddTeam($team: TeamNewInput!) {
              createTeam(data: $team) {
                id
                name
                teamNumber
                abbreviation
              }
            }
          `,
          variables: {
            team: {
              ...team,
              clubId: this.data.club.id,
            },
          },
        })
        .pipe(map(({ data }) => new Team(data?.createTeam)))
    );

    this.data.team = newTeam;
    const club = this.data.club;
    club.teams = [...(club.teams ?? []), newTeam];
    this.data.club = { ...club };
    this.update$.next(0);
  }

  async onTeamUpdated(team: Partial<Team>) {
    await lastValueFrom(
      this.apollo.mutate<{ createTeam: Partial<Team> }>({
        mutation: gql`
          mutation UpdateTeam($team: TeamUpdateInput!) {
            updateTeam(data: $team) {
              id
              name
              teamNumber
              abbreviation
            }
          }
        `,
        variables: {
          team,
        },
      })
    );
    this.update$.next(0);
  }

  async onCaptainUpdated(player: Partial<Player>) {
    await lastValueFrom(
      this.apollo
        .mutate<{ updatePlayer: Player }>({
          mutation: gql`
            mutation UpdatePlayer($data: PlayerUpdateInput!) {
              updatePlayer(data: $data) {
                id
                firstName
                lastName
              }
            }
          `,
          variables: {
            data: player,
          },
        })
        .pipe(map((r) => new Player(r.data?.updatePlayer)))
    );
    this.update$.next(0);
  }

  async onLocationAdded(location: string, team: Team) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation AddTeamLocation($teamId: ID!, $locationId: ID!) {
            addLocationFromTeam(teamId: $teamId, locationId: $locationId) {
              id
            }
          }
        `,
        variables: {
          teamId: team.id,
          locationId: location,
        },
      })
    );

    this.update$.next(0);
  }

  async onLocationRemoved(location: string, team: Team) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation RemoveTeamLocation($teamId: ID!, $locationId: ID!) {
            removeLocationFromTeam(teamId: $teamId, locationId: $locationId) {
              id
            }
          }
        `,
        variables: {
          teamId: team.id,
          locationId: location,
        },
      })
    );

    this.update$.next(0);
  }
}
