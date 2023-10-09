import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { AuthenticateService, LoggedinUser } from '@badman/frontend-auth';
import { ClubMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'badman-user-shortcuts',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatListModule,
    MatDividerModule,
    RouterModule,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './user-shortcuts.component.html',
  styleUrls: ['./user-shortcuts.component.scss'],
})
export class UserShortcutsComponent implements OnInit {
  user$?: Observable<LoggedinUser>;

  expanded = {
    club: true,
  };

  constructor(private authenticateService: AuthenticateService) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$?.pipe(
      map((user) => {
        user.clubs = user.clubs
          ?.filter(
            (club) =>
              club.clubMembership?.end === undefined ||
              club.clubMembership?.end === null ||
              club.clubMembership?.end > new Date()
          )
          .sort((a, b) => {
            // sort by membership type, first normal then loan
            if (
              a.clubMembership?.membershipType ===
              b.clubMembership?.membershipType
            ) {
              return 0;
            }

            if (
              a.clubMembership?.membershipType === ClubMembershipType.NORMAL
            ) {
              return -1;
            }

            if (
              b.clubMembership?.membershipType === ClubMembershipType.NORMAL
            ) {
              return 1;
            }

            return 0;
          });
        return user;
      })
    );
  }
}
