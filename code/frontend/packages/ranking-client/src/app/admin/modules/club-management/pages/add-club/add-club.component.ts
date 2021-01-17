import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Club, ClubService } from 'app/_shared';

@Component({
  templateUrl: './add-club.component.html',
  styleUrls: ['./add-club.component.scss'],
})
export class AddClubComponent {
  club: Club;

  constructor(private clubSerice: ClubService, private router: Router) {}

  async add(club: Club) {
    this.club = club;
  }

  async save() {
    const newClub = await this.clubSerice.addClub(this.club).toPromise();
    this.router.navigate(['club', newClub.id]);
  }
}
