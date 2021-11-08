import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgcCookieConsentService, NgcNoCookieLawEvent, NgcStatusChangeEvent } from 'ngx-cookieconsent';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  IS_COOKIE_ALLOWED: string = 'cookie';

  //keep refs to subscriptions to be able to unsubscribe later
  private statusChangeSubscription!: Subscription;

  constructor(
    updates: SwUpdate,
    snackBar: MatSnackBar,
    translate: TranslateService,
    private ccService: NgcCookieConsentService,
    private cookieService: CookieService
  ) {
    updates.available.subscribe((event) => {
      updates.activateUpdate().then(() => {
        snackBar
          .open('New version available', 'refresh')
          .onAction()
          .subscribe(() => {
            document.location.reload();
          });
      });
    });
  }

  ngOnInit() {
    this.statusChangeSubscription = this.ccService.statusChange$.subscribe((event: NgcStatusChangeEvent) => {
      if (event.status === 'allow' || event.status === 'dismiss') {
        this.cookieService.set(this.IS_COOKIE_ALLOWED, 'true');
        this.ccService.destroy();
      } else {
        this.cookieService.delete(this.IS_COOKIE_ALLOWED);
      }
    });
    let isCookieAllowed = this.cookieService.get(this.IS_COOKIE_ALLOWED);
    if (isCookieAllowed == 'true') {
      this.ccService.destroy();
    }

  }

  ngOnDestroy() {
    this.statusChangeSubscription.unsubscribe();
  }
}
