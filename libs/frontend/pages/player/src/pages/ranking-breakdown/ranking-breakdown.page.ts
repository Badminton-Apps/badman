import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  TransferState,
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
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { Subject, combineLatest, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
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

    // Material
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatProgressBarModule,

    // Own Components
    ListGamesComponent,
    PeriodSelectionComponent,
    RankingEvolutionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingBreakdownPageComponent implements OnDestroy {
  // Dependencies
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private systemService = inject(RankingSystemService);
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  // route
  queryParams = toSignal(this.route.queryParamMap);
  routeParams = toSignal(this.route.paramMap);
  routeData = toSignal(this.route.data);

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
    includedIgnored: new FormControl(
      this.routeParams()?.get('includedIgnored') ?? false
    ),
    includedUpgrade: new FormControl(
      this.routeParams()?.get('includedUpgrade') ?? true
    ),
    includedDowngrade: new FormControl(
      this.routeParams()?.get('includedDowngrade') ?? true
    ),
    includeOutOfScope: new FormControl(
      this.routeParams()?.get('includeOutOfScope') ?? false
    ),
  });

  // Signals
  system = toSignal(this._getSystem());
  games = toSignal(this._loadGames());
  loadingGames = signal(true);

  // Computed
  player = computed(() => this.routeData()?.['player'] as Player);
  id = computed(() => this.routeParams()?.get('id'));

  // specific computed value so the effect only triggers when the end date changes
  periodEndRoute = computed(() => this.queryParams()?.get('end'));

  // Destroy
  destroy$ = new Subject<void>();

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

        if (!this.system()) {
          return;
        }

        this._loadPeriodFilter();
      },
      {
        allowSignalWrites: true,
      }
    );

    this.gameFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this._updateUrl();
      });
  }

  private _loadPeriodFilter() {
    const end = this.periodEndRoute() ?? null;

    // Default we take next update interval, if no end is given
    const endPeriod =
      (end ?? null) == null
        ? moment(this.system()?.caluclationIntervalLastUpdate)
        : moment(end);
    const startPeriod = endPeriod
      .clone()
      .subtract(this.system()?.periodAmount, this.system()?.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.system()?.updateIntervalAmount,
        this.system()?.updateIntervalUnit
      );

    const nextPeriod = startPeriod
      .clone()
      .add(
        this.system()?.caluclationIntervalAmount,
        this.system()?.calculationIntervalUnit
      );

    this.periodFilter.setValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });
  }

  private _getSystem() {
    return this.systemService.getPrimarySystemsWhere().pipe(
      switchMap((query) =>
        this.apollo
          .query<{ rankingSystems: RankingSystem[] }>({
            query: gql`
              query getPrimary($where: JSONObject) {
                rankingSystems(where: $where) {
                  id
                  differenceForUpgrade
                  differenceForDowngrade
                  updateIntervalAmountLastUpdate
                  caluclationIntervalLastUpdate
                  calculationIntervalUnit
                  caluclationIntervalAmount
                  minNumberOfGamesUsedForUpgrade
                  updateIntervalAmount
                  updateIntervalUnit
                  periodAmount
                  periodUnit
                  pointsToGoUp
                  pointsWhenWinningAgainst
                  pointsToGoDown
                  amountOfLevels
                  latestXGamesToUse
                }
              }
            `,
            variables: {
              where: query,
            },
          })
          .pipe(
            transferState('primarySystem', this.stateTransfer, this.platformId),
            map((x) => {
              if (!x?.data?.rankingSystems?.length) {
                throw new Error('No ranking system found');
              }

              return new RankingSystem(x.data.rankingSystems[0]);
            })
          )
      )
    );
  }

  private _loadGames() {
    return combineLatest([
      this.gameFilter
        .get('gameType')
        ?.valueChanges.pipe(startWith(this.gameFilter.value.gameType)) ??
        of(null),
      this.periodFilter.get('game')?.valueChanges ?? of(null),
      this.periodFilter.get('end')?.valueChanges ?? of(null),
    ]).pipe(
      distinctUntilChanged(),
      tap(() => this.loadingGames.set(true)),
      switchMap(([gameType, start, end]) =>
        this.apollo.query<{ player: Player }>({
          fetchPolicy: 'no-cache',
          query: gql`
            query PlayerGames(
              $where: JSONObject
              $playerId: ID!
              $rankingType: ID!
            ) {
              player(id: $playerId) {
                id
                games(where: $where) {
                  id
                  playedAt
                  winner
                  status
                  players {
                    id
                    team
                    player
                    fullName
                    single
                    double
                    mix
                  }
                  rankingPoints(where: { systemId: $rankingType }) {
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
              gameType:
                gameType == 'single' ? 'S' : gameType == 'double' ? 'D' : 'MX',
              playedAt: {
                $between: [start, end],
              },
            },
            playerId: this.player().id,
            rankingType: this.system()?.id,
          },
        })
      ),
      map((x) => x.data.player.games?.map((g) => new Game(g)) ?? []),
      map((games) =>
        games.filter((game) => (game.rankingPoints?.length ?? 0) > 0)
      ),
      tap(() => this.loadingGames.set(false))
    );
  }

  private _updateUrl() {
    const systemLastUpdate = moment(
      this.system()?.caluclationIntervalLastUpdate
    );

    const queryParams: { [key: string]: string | boolean | null | undefined } =
      {
        includedIgnored: this.gameFilter.value.includedIgnored
          ? true
          : undefined,
        includedUpgrade: this.gameFilter.value.includedUpgrade
          ? undefined
          : false,
        includedDowngrade: this.gameFilter.value.includedDowngrade
          ? undefined
          : false,
        includeOutOfScope: this.gameFilter.value.includeOutOfScope
          ? true
          : undefined,
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
