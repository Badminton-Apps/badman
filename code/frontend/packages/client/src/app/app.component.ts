import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgcCookieConsentService, NgcNoCookieLawEvent, NgcStatusChangeEvent } from 'ngx-cookieconsent';
import { filter, map, mergeMap, Subscription, switchMap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { AuthGuard } from './_shared';

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
    private ccService: NgcCookieConsentService,
    private cookieService: CookieService,
    public authGuard: AuthGuard
  ) {
    updates.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map((evt) => ({
          type: 'UPDATE_AVAILABLE', 
          current: evt.currentVersion,
          available: evt.latestVersion,
        }))
      )
      .subscribe((update) => {
        snackBar
          .open(`New version available.`, 'refresh')
          .onAction()
          .subscribe(() => {
            document.location.reload();
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
