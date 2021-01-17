import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, ClubService } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent {
  club$: Observable<Club>;

  constructor(
    private clubService: ClubService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.club$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => this.clubService.getClub(parseInt(id, 10))),
      tap(r => console.log(r))
    );
  }
}
