import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { NotificationService } from '@badman/frontend-auth';
import { Notification } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { Observable } from 'rxjs';

@Component({
    templateUrl: './overview.page.html',
    styleUrls: ['./overview.page.scss'],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        TranslateModule,
        MatListModule,
        MatButtonModule,
        MatIconModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewPageComponent implements OnInit {
  private seoService = inject(SeoService);
  private notifService = inject(NotificationService);
  private platformId = inject<string>(PLATFORM_ID);
  notifications$?: Observable<Notification[] | undefined>;
  showRead = false;

  ngOnInit(): void {
    this.seoService.update({
      title: 'Notifications',
      description: `Notifications`,
      type: 'website',
      keywords: ['notification', 'badminton'],
    });

    if (isPlatformBrowser(this.platformId) && this.notifService.notifications$ != undefined) {
      this.notifications$ = this.notifService.notifications$;
    }
  }

  readNotification(notification: Notification) {
    this.notifService.readNotification(notification, true);
  }

  unreadNotification(notification: Notification) {
    this.notifService.readNotification(notification, false);
  }

  getParams(notification: Notification) {
    switch (notification.type) {
      case 'encounterNotEnteredNotification':
        return {
          encounter: {
            ...notification.encounter,
            date: moment(notification.encounter?.date).format('YYYY-MM-DD'),
          },
        };
      case 'encounterNotAccepted':
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

      default:
        return undefined;
    }
  }
}
