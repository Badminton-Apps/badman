import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Club, ClubService } from 'app/_shared';

@Component({
  templateUrl: './add-club.component.html',
  styleUrls: ['./add-club.component.scss'],
})
export class AddClubComponent {
  constructor(private clubSerice: ClubService, private router: Router) {}

  async add(club: Club) {
    await this.clubSerice.addClub(club).toPromise();
    await this.router.navigate(['admin', 'club']);
  }
}
