import { PlayerService } from './../../../_shared/services/player/player.service';
import { Apollo } from 'apollo-angular';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Club, Player, SystemService, Team, TeamService } from 'app/_shared';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './team-dialog.component.html',
  styleUrls: ['./team-dialog.component.scss'],
})
export class TeamDialogComponent implements OnInit {
  team$: Observable<Team>;
  alreadyUsed$: Observable<string[]>;

  update$ = new BehaviorSubject(0);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { team: Team; club: Club },
    private teamService: TeamService,
    private systemService: SystemService,
  ) {}

  ngOnInit(): void {
    this.team$ = this.update$.pipe(
      startWith(0),
      switchMap(() => this.systemService.getPrimarySystem()),
      switchMap((system) => {
        if (this.data.team?.id) {
          return this.teamService.getTeam(this.data.team?.id, system.id);
        } else {
          return of(null);
        }
      }),
      map((t) => t ?? new Team())
    );

    if (this.data.club) {
      this.alreadyUsed$ = this.team$.pipe(
        map(
          (team) =>
            this.data.club.teams
              .filter(
                (t) => t.type == team?.type && t.id != team?.id && t.active
              )
              ?.map((t) => t.players.filter((p) => p.base).map((p) => p.id))
              ?.flat() ?? []
        ),
        startWith([])
      );
    }
  }

  async onPlayerAddedToTeam(player: Player, team: Team) {
    if (player) {
      await this.teamService.addPlayer(team, player).toPromise();

      this.update$.next(0);
    }
  }

  async onPlayerRemovedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await this.teamService.removePlayer(team, player).toPromise();
      this.update$.next(0);
    }
  }

  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team.id) {
      await this.teamService.updatePlayer(team, player).toPromise();
      this.update$.next(0);
    }
  }

  async create() {
    const newTeam = await this.teamService
      .addTeam(this.data.team, this.data.club.id)
      .toPromise();
    this.data.team = newTeam;
    this.update$.next(0);
  }

  async updatedTeam(team: Team) {
    console.log(team);

    if (team?.id) {
      await this.teamService.updateTeam(team).toPromise();

      this.update$.next(0);
    } else {
      this.data.team = team;
    }
  }
}
