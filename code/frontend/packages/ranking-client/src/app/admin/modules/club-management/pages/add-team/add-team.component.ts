import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, ClubService, Team, TeamService } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './add-team.component.html',
  styleUrls: ['./add-team.component.scss'],
})
export class AddTeamComponent implements OnInit {
  club$: Observable<Club>;
  team: Team;

  constructor(
    private teamSerice: TeamService,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.club$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => this.clubService.getClub(parseInt(id, 10)))
    );
  }

  async add(team: Team, club: Club) {
    await this.teamSerice.addTeam(team, club.id).toPromise();
    await this.router.navigate(['club', club.id]);
  }
}
