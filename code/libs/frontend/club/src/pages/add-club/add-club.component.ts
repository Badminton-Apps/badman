import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ClubService } from '@badman/frontend/shared';
import { Club } from '@badman/frontend/models';

@Component({
  templateUrl: './add-club.component.html',
  styleUrls: ['./add-club.component.scss'],
})
export class AddClubComponent {
  club!: Club;

  constructor(private clubSerice: ClubService, private router: Router) {}

  async add(club: Club) {
    this.club = club;
  }

  async save() {
    const newClub = await lastValueFrom(this.clubSerice.addClub(this.club));
    this.router.navigate(['club', newClub.id]);
  }
}
