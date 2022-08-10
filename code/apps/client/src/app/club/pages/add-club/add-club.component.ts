import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Club } from '@badman/frontend/shared';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map } from 'rxjs';

@Component({
  templateUrl: './add-club.component.html',
  styleUrls: ['./add-club.component.scss'],
})
export class AddClubComponent {
  club!: Club;

  constructor(private apollo: Apollo, private router: Router) {}

  async add(club: Club) {
    this.club = club;
  }

  async save() {
    const newClub = await lastValueFrom(
      this.apollo
        .mutate<{ addClub: Partial<Club> }>({
          mutation: gql`
            mutation AddClub($club: ClubInput!) {
              addClub(club: $club) {
                id
                name
                fullName
                abbreviation
                clubId
              }
            }
          `,
          variables: {
            club: this.club,
          },
        })
        .pipe(
          map((x) => {
            if (!x.data?.addClub) {
              throw new Error('No club returned');
            }
            return new Club(x.data.addClub);
          })
        )
    );

    this.router.navigate(['club', newClub.id]);
  }
}
