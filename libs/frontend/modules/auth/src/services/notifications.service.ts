import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

import { map, switchMap } from 'rxjs/operators';

import { SwPush } from '@angular/service-worker';
import { Claim, Notification } from '@badman/frontend-models';
import {
  BehaviorSubject,
  ReplaySubject,
  combineLatest,
  lastValueFrom,
  of,
} from 'rxjs';
import { AuthenticateService } from './authenticate.service';

const QUERY = gql`
  query GetNotifications($order: [SortOrderType!]) {
    me {
      notifications(order: $order) {
        id
        read
        type
        meta

        club {
          id
          name
        }
        competition {
          id
          name
        }
        tournament {
          id
          name
        }

        encounter {
          id
          date
          home {
            id
            name
          }
          away {
            id
            name
          }
        }
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications$ = new ReplaySubject<Notification[] | undefined>(1);
  update$ = new BehaviorSubject(null);
  readonly VAPID_PUBLIC_KEY =
    'BNLv_q5Q5wfDi75nas8b_eZKIKz8QOkgXi-jrKyzzr18AfQCYIhUvswR_AOBZQqEVGi_EGdSBidCK_oYDpy1zXk';

  constructor(
    private apollo: Apollo,
    private authService: AuthenticateService,
    private swPush: SwPush
  ) {
    combineLatest([this.authService.user$, this.update$])
      .pipe(
        switchMap(([player]) => {
          if (!player?.loggedIn) {
            return of(undefined);
          }

          // subscribe to push notifications
          this.subscribeToNotifications();

          // get unread notifications
          return this.apollo
            .query<{ me: { notifications: Notification[] } }>({
              query: QUERY,
              fetchPolicy: 'network-only',
              variables: {
                order: [
                  {
                    direction: 'DESC',
                    field: 'createdAt',
                  },
                ],
              },
            })
            .pipe(map((result) => result.data.me?.notifications));
        })
      )
      .subscribe((notifications) => {
        this.notifications$.next(notifications);
      });
  }

  readNotification(notification: Notification, read: boolean) {
    this.apollo
      .mutate<{ claims: Claim[] }>({
        mutation: gql`
          mutation UpdateNotification($data: NotificationUpdateInput!) {
            updateNotification(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: notification.id,
            read,
          },
        },
      })
      .subscribe(() => {
        this.update$.next(null);
      });
  }

  async subscribeToNotifications() {
    if (this.swPush.isEnabled) {
      try {
        const sub = await this.swPush.requestSubscription({
          serverPublicKey: this.VAPID_PUBLIC_KEY,
        });

        await lastValueFrom(
          this.apollo.mutate({
            mutation: gql`
              mutation AddPushSubScription(
                $subscription: PushSubscriptionInputType!
              ) {
                addPushSubScription(subscription: $subscription)
              }
            `,
            variables: {
              subscription: sub,
            },
          })
        );
      } catch (e) {
        console.error(e);
      }
    }
  }
}
