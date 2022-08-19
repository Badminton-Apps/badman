import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
} from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { apolloCache } from '@badman/frontend/graphql';
import { Club, Team } from '@badman/frontend/models';
import { AddPlayerComponent } from '../../dialogs';
import { TeamDialogComponent } from '@badman/frontend/team';
import {
  ClubService,
  TeamService,
  SystemService,
} from '@badman/frontend/shared';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent implements OnInit {
  club$!: Observable<Club>;
  update$ = new BehaviorSubject(false);

  activeTeams$ = new BehaviorSubject(true);

  constructor(
    private apollo: Apollo,
    private clubService: ClubService,
    private teamService: TeamService,
    private systemService: SystemService,
    private titleService: Title,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.club$ = combineLatest([
      this.route.paramMap,
      this.activeTeams$,
      this.systemService.getPrimarySystem(),

      // Triggers refresh
      this.update$,
    ]).pipe(
      switchMap(([params, activeTeams, primarySystem]) => {
        const clubId = params.get('id');
        if (!clubId) {
          throw new Error('No club id');
        }

        if (!primarySystem) {
          throw new Error('No system');
        }

        return this.apollo.query<{ club: Club }>({
          query: gql`
            query Club(
              $id: ID!
              $order: [SortOrderType!]
              $teamsWhere: JSONObject
              $lastRankingPlaceWhere: JSONObject
              $lastRankingPlacesOrder: [SortOrderType!]
            ) {
              club(id: $id) {
                id
                slug
                name
                useForTeamName
                abbreviation
                clubId
                locations {
                  id
                  name
                }
                teams(order: $order, where: $teamsWhere) {
                  id
                  slug
                  name
                  active
                  type
                  players {
                    id
                    slug
                    base
                    firstName
                    lastName
                    competitionPlayer
                    gender
                    rankingLastPlaces(
                      take: 1
                      where: $lastRankingPlaceWhere
                      order: $lastRankingPlacesOrder
                    ) {
                      id
                      systemId
                      single
                      double
                      mix
                    }
                  }
                }
              }
            }
          `,
          variables: {
            id: clubId,
            order: [
              {
                field: 'type',
                direction: 'desc',
              },
              {
                field: 'teamNumber',
                direction: 'asc',
              },
            ],
            teamsWhere: { active: activeTeams == false ? undefined : true },
            lastRankingPlaceWhere: { systemId: primarySystem.id },
            lastRankingPlacesOrder: [
              {
                field: 'rankingDate',
                direction: 'desc',
              },
            ],
          },
        });
      }),
      map((x) => new Club(x.data.club)),
      tap((club) => this.titleService.setTitle(`${club.name}`))
    );
  }

  async deleteClub(club: Club) {
    await lastValueFrom(this.clubService.removeClub(club));
    await this.router.navigate(['..']);
  }

  addPlayer(club: Club) {
    const dialogRef = this.dialog.open(AddPlayerComponent);

    dialogRef.afterClosed().subscribe(async (player) => {
      if (player) {
        await lastValueFrom(this.clubService.addPlayer(club, player));
        this.update$.next(true);
      }
    });
  }

  editTeam(team: Team, club?: Club) {
    const dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(true);
    });
  }

  addTeam(club?: Club) {
    const dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(true);
    });
  }

  async setActiveTeam(data: { team: Team; active: boolean }) {
    await lastValueFrom(
      this.apollo.mutate<{ updateTeam: Partial<Team> }>({
        mutation: gql`
          mutation UpdateTeam($team: TeamUpdateInput!) {
            updateTeam(data: $team) {
              id
              name
              active
              teamNumber
              abbreviation
            }
          }
        `,
        variables: {
          team: {
            id: data.team.id,
            active: data.active,
          },
        },
      })
    );
    // Evict cache
    const teamCache = apolloCache.identify({
      id: data.team.id,
      __typename: 'Tean',
    });
    apolloCache.evict({ id: teamCache });
    const clubCache = apolloCache.identify({
      id: data.team.clubId,
      __typename: 'Club',
    });
    apolloCache.evict({ id: clubCache });
    apolloCache.gc();

    this.update$.next(true);
  }

  async deleteTeam(team: Team) {
    if (!team.id) {
      throw new Error('No team id');
    }
    await lastValueFrom(this.teamService.deleteTeam(team.id));
    this.update$.next(true);
  }
}
