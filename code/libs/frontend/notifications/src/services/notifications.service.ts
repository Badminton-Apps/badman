import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  readonly VAPID_PUBLIC_KEY =
    'BNLv_q5Q5wfDi75nas8b_eZKIKz8QOkgXi-jrKyzzr18AfQCYIhUvswR_AOBZQqEVGi_EGdSBidCK_oYDpy1zXk';

  constructor(private swPush: SwPush) {}

  subscribeToNotifications() {
    this.swPush
      .requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY,
      })
      .then((sub) => console.log(sub))
      .catch((err) =>
        console.error('Could not subscribe to notifications', err)
      );
  }
}
