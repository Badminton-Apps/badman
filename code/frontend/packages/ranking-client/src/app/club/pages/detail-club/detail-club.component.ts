import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddPlayerComponent } from 'app/admin/modules/club-management/dialogs/add-player/add-player.component';
import { UserService } from 'app/player';
import { Club, ClubService } from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import * as moment from 'moment';

@Component({
  templateUrl: './detail-club.component.html',
  styleUrls: ['./detail-club.component.scss'],
})
export class DetailClubComponent {
  club$: Observable<Club>;
  canEditClub$: Observable<boolean>;

  update$ = new BehaviorSubject(0);

  constructor(
    private user: UserService,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.club$ = combineLatest([this.route.paramMap, this.update$]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) =>
        this.clubService.getClub(id, moment().subtract(1, 'year').toDate())
      ),
      tap((club) => {
        this.canEditClub$ = this.user.canEditClubs(club.id);
      })
    );
  }

  addPlayer(club) {
    const dialogRef = this.dialog.open(AddPlayerComponent);

    dialogRef.afterClosed().subscribe(async (player) => {
      if (player) {
        await this.clubService.addPlayer(club, player).toPromise();
        this.update$.next(null);
      }
    });
  }
}
