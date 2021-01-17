import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Club, ClubService } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-club.component.html',
  styleUrls: ['./edit-club.component.scss']
})
export class EditClubComponent implements OnInit{
  club$: Observable<Club>;

  constructor(
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

  async save(club: Club) {
    await this.clubService.updateClub(club).toPromise();
    await this.router.navigate(['club', club.id]);
  }
}
