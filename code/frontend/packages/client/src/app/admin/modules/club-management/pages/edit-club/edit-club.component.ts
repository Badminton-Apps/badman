import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, ClubService, Player, Team, TeamService } from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-club.component.html',
  styleUrls: ['./edit-club.component.scss'],
})
export class EditClubComponent implements OnInit {
  club$: Observable<Club>;
  update$ = new BehaviorSubject(0);

  constructor(
    private teamService: TeamService,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private router: Router,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.club$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) => this.clubService.getClub(id))
    );
  }

  async save(club: Club) {
    await this.clubService.updateClub(club).toPromise();
    this._snackBar.open('Saved', null, { duration: 1000, panelClass: 'success'});
  }

  async onPlayerAdded(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.addPlayer(team, player).toPromise();
      this._snackBar.open('Player added', null, { duration: 1000, panelClass: 'success'});
      this.update$.next(null);
    }
  }

  async onPlayerRemoved(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.removePlayer(team, player).toPromise();
      this._snackBar.open('Player removed', null, { duration: 1000, panelClass: 'success'});
      this.update$.next(null);
    }
  }

  async onPlayerUpdated(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.updatePlayer(team, player).toPromise();
      this._snackBar.open('Player updated', null, { duration: 1000, panelClass: 'success'});
      this.update$.next(null);
    }
  }
}
