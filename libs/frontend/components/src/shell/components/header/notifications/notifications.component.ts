import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import {
  AuthenticateService,
  NotificationService,
} from '@badman/frontend-auth';
import { GraphQLModule } from '@badman/frontend-graphql';
import { LanguageComponent } from '@badman/frontend-translation';
import { ThemeSwitcherComponent } from '../theme-switcher';
import { TranslateModule } from '@ngx-translate/core';
import { Notification } from '@badman/frontend-models';
import moment from 'moment';

@Component({
  selector: 'badman-notifications',
  standalone: true,
  imports: [
    CommonModule,
    GraphQLModule,
    RouterModule,
    TranslateModule,

    // Material components
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    MatBadgeModule,
    OverlayModule,
    MatListModule,

    // Own components
    LanguageComponent,
    ThemeSwitcherComponent,
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  isOpen = signal(false);
  notificationService = inject(NotificationService);
  authService = inject(AuthenticateService);

  notifications = toSignal(this.notificationService.notifications$);
  unread = computed(() => this.notifications()?.filter((notif) => !notif.read));

  constructor() {
    effect(() => {
      if (this.isOpen() == true) {
        this.readAllNotifications();
      }
    });
  }

  getParams(notification: Notification) {
    switch (notification.type) {
      case 'encounterNotEnteredNotification':
      case 'encounterNotAccepted':
      case 'encounterChangeConfirmationNotification':
      case 'encounterChangeNewNotification':
      case 'encounterChangeFinishedNotification':
        return {
          encounter: {
            ...notification.encounter,
            date: moment(notification.encounter?.date).format('YYYY-MM-DD'),
          },
        };

      case 'syncSuccessNotification':
        return {
          event: notification.competition ?? notification.tournament,
        };
      case 'syncFailedNotification':
        return {
          event: notification.competition ?? notification.tournament,
        };
      case 'clubEnrollmentNotification':
        return {
          club: notification.club,
        };

      default:
        return undefined;
    }
  }

  readAllNotifications() {
    for (const notification of this.notifications()?.filter(
      (n) => n.read == false,
    ) ?? []) {
      this.notificationService.readNotification(notification, true);
      notification.read = true;
    }
  }
}
