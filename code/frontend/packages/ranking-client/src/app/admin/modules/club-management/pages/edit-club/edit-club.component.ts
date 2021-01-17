import { Component, OnInit } from '@angular/core';
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.club$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) => this.clubService.getClub(parseInt(id, 10)))
    );
  }

  async save(club: Club) {
    await this.clubService.updateClub(club).toPromise();
  }

  async onPlayerAdded(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.addPlayer(team, player).toPromise();
      this.update$.next(null);
    }
  }

  async onPlayerRemoved(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.removePlayer(team, player).toPromise();
      this.update$.next(null);
    }
  }
}
