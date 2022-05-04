import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
} from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  Club,
  ClubService,
  SystemService,
  Team,
  TeamService,
} from '../../../_shared';
import { AddPlayerComponent, TeamDialogComponent } from '../../dialogs';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent implements OnInit {
  club$!: Observable<Club>;
  update$ = new BehaviorSubject(false);

  activeTeams$ = new BehaviorSubject(true);

  constructor(
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
      switchMap(([params, activeTeams, primarySystem, update]) => {
        const clubId = params.get('id');
        if (!clubId) {
          throw new Error('No club id');
        }

        if (!primarySystem) {
          throw new Error('No system');
        }

        return this.clubService.getClub(clubId, {
          playersfrom: moment().subtract(1, 'year').toDate(),
          includePlayers: true,
          includeTeams: true,
          includePlacesTeams: true,
          includeLocations: true,
          systemId: primarySystem.id,
          teamsWhere: {
            active: activeTeams ? true : undefined,
          },
          fromCache: !update,
        });
      }),
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
      this.teamService.updateTeam({ id: data.team.id, active: data.active })
    );
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
