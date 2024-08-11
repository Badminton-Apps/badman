import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player, RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import moment from 'moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectParams } from 'ngxtension/inject-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ListGamesComponent, PeriodSelectionComponent } from './components';
import { ListGamesService } from './components/list-games/list-games.service';
import { RankingEvolutionComponent } from './components/ranking-evolution';

@Component({
  templateUrl: './ranking-breakdown.page.html',
  styleUrls: ['./ranking-breakdown.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatProgressBarModule,
    ListGamesComponent,
    PeriodSelectionComponent,
    RankingEvolutionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingBreakdownPageComponent {
  // Dependencies
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private apollo = inject(Apollo);
  private destroy$ = injectDestroy();
  systemService = inject(RankingSystemService);
  private readonly listGamesService = inject(ListGamesService);

  // route
  filter = this.listGamesService.filter;

  // Computed
  player = injectRouteData<Player>('player');
  id = injectParams('id');
  type = injectParams('type');
  system = computed(() => this.systemService.system() as RankingSystem);

  // specific computed value so the effect only triggers when the end date changes
  periodEndRoute = injectQueryParams('end');
  includedIgnored = injectQueryParams('includedIgnored');
  includedUpgrade = injectQueryParams('includedUpgrade');
  includedDowngrade = injectQueryParams('includedDowngrade');
  includeOutOfScope = injectQueryParams('includeOutOfScope');

  // Games
  constructor() {
    this.seoService.update({
      title: `Ranking breakdown ${this.player()?.fullName}`,
      description: `Ranking breakdown ${this.player()?.fullName}`,
      type: 'website',
      keywords: ['ranking', 'breakdown', 'player', 'badminton'],
    });
    this.breadcrumbService.set('player/:id', `${this.player()?.fullName}`);

    effect(() => {
      this.listGamesService.filter.patchValue(
        {
          systemId: this.system().id,
          playerId: this.player()?.id,
          gameType: this.type(),
        },
        {
          // Don't emit event, as we path the url query params
          emitEvent: false,
        },
      );
    });

    effect(() => {
      this._loadQueryParamFilter();
    });

    this.filter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._updateUrl();
    });
  }

  private _loadQueryParamFilter() {
    const end = this.periodEndRoute() ?? null;

    // Default we take next update interval, if no end is given
    const endPeriod =
      (end ?? null) == null
        ? moment(this.systemService.system()?.calculationLastUpdate)
        : moment(end);
    const startPeriod = endPeriod
      .clone()
      .subtract(this.systemService.system()?.periodAmount, this.systemService.system()?.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.systemService.system()?.updateIntervalAmount,
        this.systemService.system()?.updateIntervalUnit,
      );

    const nextPeriod = startPeriod
      .clone()
      .add(
        this.systemService.system()?.calculationIntervalAmount,
        this.systemService.system()?.calculationIntervalUnit,
      );

    this.listGamesService.filter.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
      includedIgnored: this.includedIgnored() === 'true',
      includedUpgrade: (this.includedUpgrade() ?? 'true') === 'true',
      includedDowngrade: (this.includedDowngrade() ?? 'true') === 'true',
      includeOutOfScope: this.includeOutOfScope() === 'true',
    });
  }

  private _updateUrl() {
    const systemLastUpdate = moment(this.systemService.system()?.calculationLastUpdate);

    const queryParams: { [key: string]: string | boolean | null | undefined } = {
      includedIgnored: this.listGamesService.filter.value.includedIgnored ? true : undefined,
      includedUpgrade: this.listGamesService.filter.value.includedUpgrade ? undefined : false,
      includedDowngrade: this.listGamesService.filter.value.includedDowngrade ? undefined : false,
      includeOutOfScope: this.listGamesService.filter.value.includeOutOfScope ? true : undefined,
      end: systemLastUpdate.isSame(this.listGamesService.filter.value.end, 'day')
        ? null
        : this.listGamesService.filter.value.end?.format('YYYY-MM-DD'),
    };

    const url =
      this.listGamesService.filter.value.gameType !== this.type()
        ? ['..', `${this.listGamesService.filter.value.gameType}`]
        : [];

    // check if the current url is the same as the new url
    // if so, don't navigate
    const currentUrl = this.router.url;
    const newUrl = this.router
      .createUrlTree(url, {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      })
      .toString();

    if (currentUrl == newUrl) {
      return;
    }

    this.router.navigate(url, {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
