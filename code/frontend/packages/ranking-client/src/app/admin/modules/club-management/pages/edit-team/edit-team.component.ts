import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, ClubService, Team, TeamService } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Location } from '@angular/common';

@Component({
  templateUrl: './edit-team.component.html',
  styleUrls: ['./edit-team.component.scss'],
})
export class EditTeamComponent implements OnInit {
  team$: Observable<Team>;
  club$: Observable<Club>;

  constructor(
    private clubSerice: ClubService,
    private teamSerice: TeamService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.club$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => this.clubSerice.getClub(parseInt(id, 10)))
    );
    this.team$ = this.route.paramMap.pipe(
      map((x) => x.get('teamId')),
      switchMap((id) => this.teamSerice.getTeam(parseInt(id, 10)))
    );
  }

  async update(team: Team, club: Club) {
    await this.teamSerice.updateTeam(team).toPromise();
    await this.router.navigate(['/', 'admin', 'club', club.id, 'edit']);
  }
}
