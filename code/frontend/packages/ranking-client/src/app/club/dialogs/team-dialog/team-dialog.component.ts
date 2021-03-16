import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Club, Player, SystemService, Team, TeamService } from 'app/_shared';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './team-dialog.component.html',
  styleUrls: ['./team-dialog.component.scss'],
})
export class TeamDialogComponent implements OnInit {
  team$: Observable<Team>;
  alreadyUsed: string[];

  update$ = new BehaviorSubject(0);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { team: Team; club?: Club },
    private teamService: TeamService,
    private systemService: SystemService
  ) {}

  ngOnInit(): void {
    if (this.data.club) {
      this.alreadyUsed = this.data.club.teams
        .filter(
          (t) => t.type == this.data.team.type && t.id != this.data.team.id
        )
        ?.map((t) => t.players.filter((p) => p.base).map((p) => p.id))
        ?.flat();
    }

    this.team$ = this.update$.pipe(
      startWith(0),
      switchMap(() => this.systemService.getPrimarySystem()),
      switchMap((system) =>
        this.teamService.getTeam(this.data.team.id, system.id)
      )
    );
  }

  async onPlayerAddedToTeam(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.addPlayer(team, player).toPromise();
      this.update$.next(0);
    }
  }

  async onPlayerRemovedFromTeam(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.removePlayer(team, player).toPromise();
      this.update$.next(0);
    }
  }

  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.updatePlayer(team, player).toPromise();
      this.update$.next(0);
    }
  }

  async update(team: Team) {
    if (team) {
      await this.teamService.updateTeam(team).toPromise();
      this.update$.next(0);
    }
  }
}
