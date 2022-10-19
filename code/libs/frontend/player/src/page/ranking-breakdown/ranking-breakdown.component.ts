import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import {
  combineLatest,
  delay,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { Game, Player, RankingSystem } from '@badman/frontend-models';
import { PlayerService } from '@badman/frontend-shared';
import { SystemService } from '@badman/frontend-ranking';

@Component({
  templateUrl: './ranking-breakdown.component.html',
  styleUrls: ['./ranking-breakdown.component.scss'],
})
export class RankingBreakdownComponent implements OnInit {
  updateUsersTrigger = new Subject<void>();

  loadingData = true;
  data$!: Observable<{
    system: RankingSystem;
    player: Player;
    games: Game[];
    type: string;
  }>;

  period = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
    game: new FormControl(),
  });

  gameFilter = new FormGroup({
    gameType: new FormControl(),
    period: this.period,
    includedIgnored: new FormControl(false),
    includedUpgrade: new FormControl(false),
    includedDowngrade: new FormControl(false),
    includeOutOfScope: new FormControl(false),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private systemService: SystemService,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    const routeParam$ = this.route.paramMap.pipe(shareReplay(1));
    const queryParam$ = this.route.queryParams.pipe(shareReplay(1));

    // Get params on startup
    combineLatest([routeParam$, queryParam$])
      .pipe(take(1))
      .subscribe(([params, queries]) => {
        const filters: { [key: string]: unknown } = {};

        if (params.get('type')) {
          filters['gameType'] = params.get('type');
        }

        if (queries['includedIgnored']) {
          filters['includedIgnored'] = queries['includedIgnored'] == 'true';
        }
        if (queries['includedUpgrade']) {
          filters['includedUpgrade'] = queries['includedUpgrade'] == 'true';
        }
        if (queries['includedDowngrade']) {
          filters['includedDowngrade'] = queries['includedDowngrade'] == 'true';
        }
        if (queries['includeOutOfScope']) {
          filters['includeOutOfScope'] = queries['includeOutOfScope'] == 'true';
        }

        this.gameFilter.patchValue(filters);
      });

    const player$ = routeParam$.pipe(
      map((x) => x.get('id')),
      distinctUntilChanged()
    );
    const type$ = routeParam$.pipe(
      map((x) => x.get('type'), distinctUntilChanged())
    );
    const end$ = queryParam$.pipe(
      map((x) => x['end']),
      distinctUntilChanged()
    );

    this.gameFilter.valueChanges.subscribe((x) => {
      // We need a type to work
      if (x.gameType) {
        this.router.navigate([`../${x.gameType}`], {
          relativeTo: this.route,
          replaceUrl: true,
          queryParams: {
            end: x.period?.end ? x.period.end.toISOString() : undefined,
            includedIgnored: x.includedIgnored,
            includedUpgrade: x.includedUpgrade,
            includedDowngrade: x.includedDowngrade,
            includeOutOfScope: x.includeOutOfScope,
          },
          queryParamsHandling: 'merge',
        });
      }
    });

    const system$ = this.systemService.getPrimarySystemsWhere().pipe(
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
            map((x) => new RankingSystem(x.data.rankingSystems[0])),
            filter((x) => !!x),
            shareReplay(1)
          )
      )
    );

    this.data$ = combineLatest([player$, system$, type$, end$]).pipe(
      tap(() => {
        this.loadingData = true;
      }),
      delay(1),
      switchMap(([playerId, system, type, end]) => {
        if (!playerId) {
          throw new Error('No player id given');
        }

        if (!type) {
          throw new Error('No type given');
        }

        // Default we take next update interval, if no end is given
        const endPeriod =
          (end ?? null) == null
            ? moment(system.updateIntervalAmountLastUpdate).add(
                system.updateIntervalAmount,
                system.updateIntervalUnit
              )
            : moment(end);
        const startPeriod = endPeriod
          .clone()
          .subtract(system.periodAmount, system.periodUnit);
        const gamePeriod = startPeriod
          .clone()
          .subtract(system.updateIntervalAmount, system.updateIntervalUnit);

        this.period.setValue({
          start: startPeriod,
          end: endPeriod,
          game: gamePeriod,
        });

        const games = this.apollo
          .query<{ player: Player }>({
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
                      rankingPlace(where: { systemId: $rankingType }) {
                        id
                        rankingDate
                        ${type}
                      }
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
                  type == 'single' ? 'S' : type == 'double' ? 'D' : 'MX',
                playedAt: {
                  $between: [
                    this.period.get('game')?.value.toISOString(),
                    this.period.get('end')?.value.toISOString(),
                  ],
                },
              },
              playerId,
              rankingType: system?.id,
            },
          })
          .pipe(map((x) => x.data.player.games?.map((g) => new Game(g)) ?? []));

        const player = this.apollo
          .query<{ player: Partial<Player> }>({
            query: gql`
              # Write your query or mutation here
              query GetUserInfoQuery($id: ID!) {
                player(id: $id) {
                  id
                  slug
                  memberId
                  firstName
                  lastName
                  sub
                  gender
                  competitionPlayer
                  updatedAt
                }
              }
            `,
            variables: {
              id: playerId,
            },
          })
          .pipe(map((x) => new Player(x.data.player)));
        return combineLatest([of(system), player, games, of(type)]);
      }),
      map(([system, player, games, type]) => {
        this.titleService.setTitle(`${player?.fullName} - ${type}`);
        return { system, player, games, type };
      }),
      tap(() => {
        this.loadingData = false;
      })
    );
  }

  nextPeriod(system: RankingSystem) {
    const endPeriod = moment(this.period.get('end')?.value).add(
      system.updateIntervalAmount,
      system.updateIntervalUnit
    );
    const startPeriod = endPeriod
      .clone()
      .subtract(system.periodAmount, system.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(system.updateIntervalAmount, system.updateIntervalUnit);

    this.period.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
    });
  }
  prevPeriod(system: RankingSystem) {
    const endPeriod = moment(this.period.get('end')?.value).subtract(
      system.updateIntervalAmount,
      system.updateIntervalUnit
    );
    const startPeriod = endPeriod
      .clone()
      .subtract(system.periodAmount, system.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(system.updateIntervalAmount, system.updateIntervalUnit);

    this.period.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
    });
  }
}
