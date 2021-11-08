import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Apollo } from 'apollo-angular';
import { Club, Player, Team, TeamService, Location } from 'app/_shared';
import { BehaviorSubject, lastValueFrom, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import * as updatePlayerMutation from '../../../_shared/graphql/players/mutations/UpdatePlayerMutation.graphql';
import * as teamQuery from '../../../_shared/graphql/teams/queries/GetTeamQuery.graphql';
import * as updateTeamLocation from './graphql/UpdateTeamLocation.graphql';

@Component({
  templateUrl: './team-dialog.component.html',
  styleUrls: ['./team-dialog.component.scss'],
})
export class TeamDialogComponent implements OnInit {
  team$!: Observable<Team>;
  alreadyUsed$!: Observable<string[]>;

  update$ = new BehaviorSubject(0);

  form!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { team: Team; club: Club; allowEditType: boolean; allowEditNumber: boolean },
    private teamService: TeamService,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    this.team$ = this.update$.pipe(
      startWith(0),
      switchMap(() => {
        if (this.data.team?.id) {
          return this.apollo
            .query<{ team: Team }>({
              query: teamQuery,
              variables: {
                id: this.data.team?.id,
              },
            })
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
              ?.filter((t) => t.type == team?.type && t.id != team?.id && t.active)
              ?.map((t) => (t.players.filter((p) => p.base).map((p) => p.id) ?? []) as string[])
              ?.flat() ?? []
          );
        }),
        startWith([])
      );
    }

    this.form = new FormGroup({});
  }

  async onPlayerAddedToTeam(player: Player, team: Team) {
    if (player) {
      await lastValueFrom(this.teamService.addPlayer(team, player));

      this.update$.next(0);
    }
  }

  async onPlayerRemovedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await lastValueFrom(this.teamService.removePlayer(team, player));
      this.update$.next(0);
    }
  }

  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await lastValueFrom(this.teamService.updatePlayer(team, player));
      this.update$.next(0);
    }
  }

  async teamAdded(team: Partial<Team>) {
    const newTeam = await lastValueFrom(this.teamService.addTeam(team, this.data.club.id!));

    this.data.team = newTeam;
    this.update$.next(0);
  }

  async onTeamUpdated(team: Partial<Team>) {
    await this.teamService.updateTeam(team).toPromise();
    this.update$.next(0);
  }

  async onCaptainUpdated(player: Partial<Player>) {
    await lastValueFrom(
      this.apollo
        .mutate<{ updatePlayer: Player }>({
          mutation: updatePlayerMutation,
          variables: {
            player,
          },
        })
        .pipe(map((r) => new Player(r.data?.updatePlayer)))
    );
    this.update$.next(0);
  }

  async onLocationAdded(location: Partial<Location>, team: Team) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: updateTeamLocation,
        variables: {
          teamId: team.id,
          locationId: location.id,
          use: true,
        },
      })
    );

    this.update$.next(0);
  }

  async onLocationRemoved(location: Partial<Location>, team: Team) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: updateTeamLocation,
        variables: {
          teamId: team.id,
          locationId: location.id,
          use: false,
        },
      })
    );

    this.update$.next(0);
  }
}
