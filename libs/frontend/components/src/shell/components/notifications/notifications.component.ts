import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import {
  NotificationService
} from '@badman/frontend-auth';
import { GraphQLModule } from '@badman/frontend-graphql';
import { LanguageComponent } from '@badman/frontend-translation';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ThemeSwitcherComponent } from '../theme-switcher';

@Component({
  selector: 'badman-notifications',
  standalone: true,
  imports: [
    CommonModule,
    GraphQLModule,
    RouterModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    LanguageComponent,
    ThemeSwitcherComponent,
    MatBadgeModule,
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationComponent implements OnInit {
  unreadNotifications$?: Observable<number | undefined>;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.unreadNotifications$ = this.notificationService.notifications$.pipe(
      map((notifications) => {
        if (notifications) {
          return notifications?.filter((n) => !n.read).length || -1;
        }

        return undefined;
      })
    );
  }
}
