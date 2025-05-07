import { Component, computed, inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActivationEnd,
  ChildActivationEnd,
  Event,
  GuardsCheckEnd,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  ResolveEnd,
  ResolveStart,
  Router,
  RouterModule,
  Scroll,
} from '@angular/router';
import { ServiceWorkerModule, SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ClaimService } from '@badman/frontend-auth';
import { RankingSystemService } from '@badman/frontend-graphql';
import {
  GOOGLEADS_CONFIG_TOKEN,
  GoogleAdsConfiguration,
  VERSION_INFO,
} from '@badman/frontend-html-injects';
import { Banner } from '@badman/frontend-models';
import { DEVICE } from '@badman/frontend-utils';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { derivedAsync  } from 'ngxtension/derived-async';
import { filter, map } from 'rxjs/operators';
import { BreadcrumbComponent, BreadcrumbItemDirective } from 'xng-breadcrumb';
import { HasClaimComponent } from '../../has-claim';
import {
  BannerComponent,
  HeaderMenuComponent,
  LogoComponent,
  NotificationComponent,
  SearchBoxComponent,
  ServiceStatusComponent,
  UserShortcutsComponent,
} from '../components';
@Component({
    selector: 'badman-shell',
    imports: [
        CommonModule,
        RouterModule,
        UserShortcutsComponent,
        HeaderMenuComponent,
        SearchBoxComponent,
        BannerComponent,
        NotificationComponent,
        LogoComponent,
        ServiceStatusComponent,
        ServiceWorkerModule,
        BreadcrumbComponent,
        BreadcrumbItemDirective,
        TranslatePipe,
        MatSidenavModule,
        MatSlideToggleModule,
        MatToolbarModule,
        MatIconModule,
        MatListModule,
        MatButtonModule,
        MatSnackBarModule,
        MatProgressBarModule,
        MatTooltipModule,
        HasClaimComponent,
    ],
    templateUrl: './shell.component.html',
    styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  public config = inject<GoogleAdsConfiguration>(GOOGLEADS_CONFIG_TOKEN);
  private platformId = inject<string>(PLATFORM_ID);
  public versionInfo = inject<{
    beta: boolean;
    version: string;
  }>(VERSION_INFO);
  private apollo = inject(Apollo);
  private router = inject(Router);
  systemService = inject(RankingSystemService);
  isHandset = inject(DEVICE);
  private auth = inject(ClaimService);
  loading = false;
  development = isDevMode();
  expanded = {
    competition: true,
    admin: true,
    general: false,
  };

  banner?: Banner;

  canAnyEnroll = this.auth.hasClaimSignal('enlist-any:team');
  canViewEnroll = this.auth.hasClaimSignal('*_enlist:team');

  canAnyChange = this.auth.hasClaimSignal('change-any:encounter');
  canViewChange = this.auth.hasClaimSignal('*change:encounter');

  openEnrollments = derivedAsync (() =>
    this.apollo
      .query<{
        eventTournaments: { count: number };
        eventCompetitions: { count: number };
      }>({
        query: gql`
          # we request only first one, because if it's more that means it's open
          query CanEnroll($where: JSONObject) {
            eventCompetitions(take: 1, where: $where) {
              count
            }
          }
        `,
        variables: {
          where: {
            openDate: { $lte: new Date().toISOString() },
            closeDate: { $gte: new Date().toISOString() },
          },
        },
      })
      .pipe(
        map(
          (events) =>
            (events?.data?.eventTournaments?.count ?? 0) != 0 ||
            (events?.data?.eventCompetitions?.count ?? 0) != 0,
        ),
      ),
  );

  // openChangeEncounter = derivedAsync (() =>
  //   this.apollo
  //     .query<{
  //       eventTournaments: { count: number };
  //       eventCompetitions: { count: number };
  //     }>({
  //       query: gql`
  //         # we request only first one, because if it's more that means it's open
  //         query CanChange($where: JSONObject) {
  //           eventCompetitions(take: 1, where: $where) {
  //             count
  //           }
  //         }
  //       `,
  //       variables: {
  //         where: {
  //           changeOpenDate: { $lte: new Date().toISOString() },
  //           changeCloseDate: { $gte: new Date().toISOString() },
  //         },
  //       },
  //     })
  //     .pipe(
  //       map(
  //         (events) =>
  //           (events?.data?.eventTournaments?.count ?? 0) != 0 ||
  //           (events?.data?.eventCompetitions?.count ?? 0) != 0,
  //       ),
  //     ),
  // );

  canEnroll = computed(
    () => this.canAnyEnroll() || (this.canViewEnroll() && this.openEnrollments()),
  );

  // canChange = computed(
  //   () => this.canAnyChange() || (this.canViewChange() && this.openChangeEncounter()),
  // );

  constructor() {
    const snackBar = inject(MatSnackBar);
    const updates = inject(SwUpdate);

    this.banner = new Banner(
      this.config.publisherId,
      this.config.slots.sidebar,
      this.config.enabled,
      this.config.debug,
    );

    if (isPlatformBrowser(this.platformId)) {
      updates.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map((evt) => ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          })),
        )
        .subscribe(() => {
          snackBar
            .open(`New version available.`, 'refresh', { duration: 0 })
            .onAction()
            .subscribe(() => {
              document.location.reload();
            });
        });

      this.router.events.subscribe((event: Event) => {
        let scrollEvent: Scroll | null = null;
        if (event instanceof Scroll) {
          scrollEvent = event;
        }

        switch (true) {
          case event instanceof NavigationStart:
          case event instanceof ResolveStart: {
            this.loading = true;
            break;
          }

          case event instanceof NavigationEnd:
          case event instanceof ResolveEnd:
          case event instanceof ActivationEnd:
          case event instanceof ChildActivationEnd:
          case event instanceof NavigationCancel:
          case event instanceof NavigationError:
          case event instanceof GuardsCheckEnd:
          case scrollEvent?.routerEvent instanceof NavigationEnd:
          case scrollEvent?.routerEvent instanceof ResolveEnd:
          case scrollEvent?.routerEvent instanceof ActivationEnd:
          case scrollEvent?.routerEvent instanceof ChildActivationEnd:
          case scrollEvent?.routerEvent instanceof NavigationCancel:
          case scrollEvent?.routerEvent instanceof NavigationError:
          case scrollEvent?.routerEvent instanceof GuardsCheckEnd: {
            this.loading = false;
            break;
          }

          default: {
            break;
          }
        }
      });
    }
  }
}
