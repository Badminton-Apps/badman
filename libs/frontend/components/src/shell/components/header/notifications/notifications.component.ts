import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { AuthenticateService, NotificationService } from '@badman/frontend-auth';
import { GraphQLModule } from '@badman/frontend-graphql';
import { Notification } from '@badman/frontend-models';
import { LanguageComponent } from '@badman/frontend-translation';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { bufferCount, concatMap, delay, forkJoin, from } from 'rxjs';
import { ThemeSwitcherComponent } from '../theme-switcher';

@Component({
  selector: 'badman-notifications',
  standalone: true,
  imports: [
    CommonModule,
    GraphQLModule,
    RouterModule,
    TranslateModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    MatBadgeModule,
    OverlayModule,
    MatListModule,
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
    const notificationsToProcess =
      this.notifications()
        ?.filter((n) => n.read == false)
        ?.map((notification) => this.notificationService.readNotification(notification, true).pipe(delay(50))) ?? [];

    // process notifications one by one
    from(notificationsToProcess)
      .pipe(
        bufferCount(1),
        concatMap((buffer) => forkJoin(buffer)),
      )
      .subscribe();
  }
}
