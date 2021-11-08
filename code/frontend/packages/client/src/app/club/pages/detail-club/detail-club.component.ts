import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddPlayerComponent } from 'app/admin/modules/club-management/dialogs/add-player/add-player.component';
import { TeamDialogComponent } from 'app/club/dialogs';
import { Club, ClubService, SystemService, Team, TeamService } from 'app/_shared';
import * as moment from 'moment';
import { BehaviorSubject, combineLatest, lastValueFrom, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent {
  club$!: Observable<Club>;
  update$ = new BehaviorSubject(null);

  activeTeams$ = new BehaviorSubject(true);

  constructor(
    private clubService: ClubService,
    private teamService: TeamService,
    private systemService: SystemService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.club$ = combineLatest([
      this.route.paramMap,
      this.activeTeams$,
      this.systemService.getPrimarySystem(),

      // Triggers refresh
      this.update$,
    ]).pipe(
      switchMap(([params, activeTeams, primarySystem]) => {
        return this.clubService.getClub(params.get('id')!, {
          playersfrom: moment().subtract(1, 'year').toDate(),
          includePlayers: true,
          includeTeams: true,
          includePlacesTeams: true,
          includeLocations: true,
          systemId: primarySystem!.id,
          teamsWhere: {
            active: activeTeams ? true : undefined,
          },
        });
      })
    );
  }

  async deleteClub(club: Club) {
    await lastValueFrom(this.clubService.removeClub(club));
    this.router.navigate(['..']);
  }
  addPlayer(club: Club) {
    const dialogRef = this.dialog.open(AddPlayerComponent);

    dialogRef.afterClosed().subscribe(async (player) => {
      if (player) {
        await lastValueFrom(this.clubService.addPlayer(club, player));
        this.update$.next(null);
      }
    });
  }

  editTeam(team: Team, club?: Club) {
    let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { team, club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(null);
    });
  }

  addTeam(club?: Club) {
    let dialogRef = this.dialog.open(TeamDialogComponent, {
      data: { club, allowEditNumber: false },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(null);
    });
  }

  async setActiveTeam(data: { team: Team; active: boolean }) {
    await lastValueFrom(this.teamService.updateTeam({ id: data.team.id, active: data.active }));
    this.update$.next(null);
  }

  async deleteTeam(team: Team) {
    await lastValueFrom(this.teamService.deleteTeam(team.id!));
    this.update$.next(null);
  }
}
