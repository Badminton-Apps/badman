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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Game, Player, RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ListGamesComponent, PeriodSelectionComponent } from './components';
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

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData = toSignal(this.route.data);

  // filters
  periodFilter = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
    game: new FormControl(),
    next: new FormControl(),
  });

  gameFilter = new FormGroup({
    gameType: new FormControl(this.routeParams()?.get('type')),
    period: this.periodFilter,
    includedIgnored: new FormControl(this.routeParams()?.get('includedIgnored') ?? false),
    includedUpgrade: new FormControl(this.routeParams()?.get('includedUpgrade') ?? true),
    includedDowngrade: new FormControl(this.routeParams()?.get('includedDowngrade') ?? true),
    includeOutOfScope: new FormControl(this.routeParams()?.get('includeOutOfScope') ?? false),
  });

  // Signals
  games = toSignal(this._loadGames());
  loadingGames = signal(true);

  // Computed
  player = computed(() => this.routeData()?.['player'] as Player);
  id = computed(() => this.routeParams()?.get('id'));
  system = computed(() => this.systemService.system() as RankingSystem);

  // specific computed value so the effect only triggers when the end date changes
  periodEndRoute = computed(() => this.queryParams()?.get('end'));

  // Games
  constructor() {
    this.seoService.update({
      title: `Ranking breakdown ${this.player().fullName}`,
      description: `Ranking breakdown ${this.player().fullName}`,
      type: 'website',
      keywords: ['ranking', 'breakdown', 'player', 'badminton'],
    });
    this.breadcrumbService.set('player/:id', this.player().fullName);

    effect(
      () => {
        if (!this.player()) {
          return;
        }

        if (!this.systemService.system()) {
          return;
        }

        this._loadPeriodFilter();
      },
      {
        allowSignalWrites: true,
      },
    );

    this.gameFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._updateUrl();
    });
  }

  private _loadPeriodFilter() {
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

    this.periodFilter.setValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });
  }

  private _loadGames() {
    return combineLatest([
      this.gameFilter
        .get('gameType')
        ?.valueChanges.pipe(startWith(this.gameFilter.value.gameType)) ?? of(null),
      this.periodFilter.get('game')?.valueChanges ?? of(null),
      this.periodFilter.get('end')?.valueChanges ?? of(null),
    ]).pipe(
      distinctUntilChanged(),
      tap(() => this.loadingGames.set(true)),
      switchMap(([gameType, start, end]) =>
        this.apollo.query<{ player: Player }>({
          fetchPolicy: 'no-cache',
          query: gql`
            query PlayerGames($where: JSONObject, $playerId: ID!, $systemId: ID!) {
              player(id: $playerId) {
                id
                games(where: $where) {
                  id
                  playedAt
                  winner
                  status
                  gameType
                  players {
                    id
                    team
                    player
                    fullName
                    single
                    double
                    mix
                  }
                  rankingPoints(where: { systemId: $systemId }) {
                    id
                    differenceInLevel
                    playerId
                    points
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              gameType: gameType == 'single' ? 'S' : gameType == 'double' ? 'D' : 'MX',
              playedAt: {
                $between: [start, end],
              },
            },
            playerId: this.player().id,
            systemId: this.systemService.system()?.id,
          },
        }),
      ),
      map((x) => x.data.player.games?.map((g) => new Game(g)) ?? []),
      map((games) => games.filter((game) => (game.rankingPoints?.length ?? 0) > 0)),
      tap(() => this.loadingGames.set(false)),
    );
  }

  private _updateUrl() {
    const systemLastUpdate = moment(this.systemService.system()?.calculationLastUpdate);

    const queryParams: { [key: string]: string | boolean | null | undefined } = {
      includedIgnored: this.gameFilter.value.includedIgnored ? true : undefined,
      includedUpgrade: this.gameFilter.value.includedUpgrade ? undefined : false,
      includedDowngrade: this.gameFilter.value.includedDowngrade ? undefined : false,
      includeOutOfScope: this.gameFilter.value.includeOutOfScope ? true : undefined,
      end: systemLastUpdate.isSame(this.periodFilter.value.end, 'day')
        ? null
        : this.periodFilter.value.end?.format('YYYY-MM-DD'),
    };

    const url =
      this.gameFilter.value.gameType !== this.routeParams()?.get('type')
        ? ['..', `${this.gameFilter.value.gameType}`]
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
