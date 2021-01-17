import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddPlayerComponent } from 'app/admin/modules/club-management/dialogs/add-player/add-player.component';
import { UserService } from 'app/player';
import { Club, ClubService } from 'app/_shared';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent {
  club$: Observable<Club>;
  canEditClub$: Observable<boolean>;

  constructor(
    private user: UserService,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.club$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => this.clubService.getClub(parseInt(id, 10))),
      tap((r) => console.log(r))
    );

    this.canEditClub$ = this.user.canEditClubs(1);
  }

  addPlayer(club){
    const dialogRef = this.dialog.open(AddPlayerComponent)

    dialogRef.afterClosed().subscribe(async player => {
      console.log(club, player)
      if (player){
        await this.clubService.addPlayer(club, player).toPromise()
      }
    })
  }
}
