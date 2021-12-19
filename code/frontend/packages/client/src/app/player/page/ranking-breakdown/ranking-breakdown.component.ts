import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import {
  DateRange,
  MatDatepicker,
  MatDateRangePicker,
  MatDateRangeSelectionStrategy,
} from '@angular/material/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Game, Player, PlayerService, RankingSystem } from 'app/_shared';
import * as moment from 'moment';
import { Moment } from 'moment';
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

@Component({
  templateUrl: './ranking-breakdown.component.html',
  styleUrls: ['./ranking-breakdown.component.scss'],
})
export class RankingBreakdownComponent implements OnInit {
  updateUsersTrigger = new Subject<void>();

  loadingData: boolean = true;
  data$!: Observable<{ system: RankingSystem; player: Player; games: Game[]; type: string }>;

  // startPeriod!: moment.Moment;
  // endPeriod!: moment.Moment;

  period = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  gameFilter = new FormGroup({
    gameType: new FormControl(),
    period: this.period,
    includedIgnored: new FormControl(false),
    includedUpgrade: new FormControl(false),
    includedDowngrade: new FormControl(false),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    const routeParam$ = this.route.paramMap.pipe(delay(1), shareReplay(1));
    const queryParam$ = this.route.queryParams.pipe(delay(1), shareReplay(1));

    const player$ = routeParam$.pipe(
      map((x) => x.get('id')),
      distinctUntilChanged()
    );
    const type$ = routeParam$.pipe(map((x) => x.get('type')));
    const end$ = queryParam$.pipe(map((x) => x['end']));

    this.gameFilter.valueChanges.subscribe((x) => {
      // We need a type to work
      if (x.gameType) {
        this.router.navigate([`../${x.gameType}`], {
          relativeTo: this.route,
          queryParams: {
            end: x.period.end ? x.period.end.toISOString() : undefined,
          },
        });
      }
    });

    combineLatest([type$])
      .pipe(take(1)) // this only needs to run once
      .subscribe(([type]) => {
        if (type) {
          this.gameFilter.get('gameType')!.setValue(type, { emitEvent: false });
        }
      });

    const system$ = this.apollo
      .query<{ systems: RankingSystem[] }>({
        query: gql`
          query getPrimary {
            systems(where: { primary: true }) {
              id
              differenceForUpgrade
              differenceForDowngrade
              updateIntervalAmountLastUpdate
              minNumberOfGamesUsedForUpgrade
              updateIntervalAmount
              updateIntervalUnit
              periodAmount
              periodUnit
            }
          }
        `,
      })
      .pipe(
        map((x) => new RankingSystem(x.data.systems[0])),
        filter((x) => !!x),
        shareReplay(1)
      );

    this.data$ = combineLatest([player$, system$, type$, end$]).pipe(
      tap((r) => {
        this.loadingData = true;
      }),
      delay(1),
      switchMap(([playerId, system, type, end]) => {
        // Default we take next update interval, if no end is given
        const endPeriod = (end ?? null) == null ?  moment(system.updateIntervalAmountLastUpdate).add(system.updateIntervalAmount, system.updateIntervalUnit) : moment(end);
        const startPeriod = endPeriod.clone().subtract(system.periodAmount, system.periodUnit);

        this.period.setValue(
          {
            start: startPeriod,
            end: endPeriod,
          },
        );

        const games = this.apollo
          .query<{ player: Player }>({
            fetchPolicy: 'no-cache',
            query: gql`
                query playerGames($where: SequelizeJSON, $playerId: ID!, $rankingType: ID!) {
                  player(id: $playerId) {
                    id
                    games(where: $where) {
                      id
                      playedAt
                      winner
                      players {
                        id
                        team
                        player
                        fullName
                        rankingPlace(where: { SystemId: $rankingType }) {
                          id
                          rankingDate
                          ${type}
                        }
                      }
                      rankingPoints(where: { SystemId: $rankingType }) {
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
                gameType: type == 'single' ? 'S' : type == 'double' ? 'D' : 'MX',
                playedAt: {
                  $between: [
                    this.period.get('start')?.value.toISOString(),
                    this.period.get('end')?.value.toISOString(),
                  ],
                },
              },
              playerId,
              rankingType: system?.id,
            },
          })
          .pipe(map((x) => x.data.player.games!));

        const player = this.playerService.getPlayer(playerId!, system?.id);
        return combineLatest([of(system), player, games, of(type!)]);
      }),
      map(([system, player, games, type]) => {
        const testing = games.find((r) => r.id == '49f79d6c-0949-48f5-a442-5b0433ddb2bc');
        console.log(testing);

        return { system, player, games, type };
      }),
      tap((r) => {
        this.loadingData = false;
      })
    );
  }

  nextPeriod(system: RankingSystem){
    const endPeriod = moment(this.period.get('end')?.value).add(system.updateIntervalAmount, system.updateIntervalUnit);
    const startPeriod = endPeriod.clone().subtract(system.periodAmount, system.periodUnit);

    this.period.setValue(
      {
        start: startPeriod,
        end: endPeriod,
      },
    );
  }
  prevPeriod(system: RankingSystem){
    const endPeriod = moment(this.period.get('end')?.value).subtract(system.updateIntervalAmount, system.updateIntervalUnit);
    const startPeriod = endPeriod.clone().subtract(system.periodAmount, system.periodUnit);

    this.period.setValue(
      {
        start: startPeriod,
        end: endPeriod,
      },
    );
  }
}
