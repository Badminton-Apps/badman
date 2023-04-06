import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { AuthenticateService, LoggedinUser } from '@badman/frontend-auth';
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
    club: false,
  };

  constructor(private authenticateService: AuthenticateService) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$?.pipe(
      map((user) => {
        user.clubs = user.clubs?.filter(
          (club) =>
            club.clubMembership?.end === undefined ||
            club.clubMembership?.end === null ||
            club.clubMembership?.end > new Date()
        );
        return user;
      })
    );
  }
}
