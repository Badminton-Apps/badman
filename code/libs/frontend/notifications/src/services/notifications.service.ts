import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  readonly VAPID_PUBLIC_KEY =
    'BNLv_q5Q5wfDi75nas8b_eZKIKz8QOkgXi-jrKyzzr18AfQCYIhUvswR_AOBZQqEVGi_EGdSBidCK_oYDpy1zXk';

  constructor(private swPush: SwPush, private apollo: Apollo) {}

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
