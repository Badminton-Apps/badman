import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { Club } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';

@Component({
  templateUrl: './add-club.component.html',
  styleUrls: ['./add-club.component.scss'],
})
export class AddClubComponent {
  private apollo = inject(Apollo);
  private router = inject(Router);
  club!: Club;

  async add(club: Club) {
    this.club = club;
  }

  async save() {
    const newClub = await lastValueFrom(
      this.apollo.mutate<{ createClub: Club }>({
        mutation: gql`
          mutation CreateClub($data: ClubCreateInput!) {
            createClub(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            ...this.club,
          },
        },
      }),
    );
    this.router.navigate(['club', newClub.data?.createClub.id]);
  }
}
