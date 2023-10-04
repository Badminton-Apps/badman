import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  TransferState,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Game, GamePlayer } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import {
  GameBreakdownType,
  GameType,
  getGameResultType,
  sortGames,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  distinctUntilChanged,
} from 'rxjs';
import {
  filter,
  map,
  mergeMap,
  shareReplay,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { LoadingBlockComponent } from '../../../loading-block';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MomentModule,
    ReactiveFormsModule,

    // Material modules
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatIconModule,

    // own modules
    LoadingBlockComponent,
  ],
  selector: 'badman-list-games',
  templateUrl: './list-games.component.html',
  styleUrls: ['./list-games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGamesComponent
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  private destroy$ = new Subject<void>();
  @Input() playerId?: string;

  filter: FormGroup<{
    choices: FormControl<string[] | null>;
  }>;

  itemsPerPage = 10;
  endOfList = false;

  recentGames$ = new BehaviorSubject<Game[]>([]); // start with an empty list
  currentPage$ = new BehaviorSubject<number>(1);

  @ViewChild('bottomObserver', { static: false }) bottomObserver!: ElementRef;

  constructor(
    formBuilder: FormBuilder,
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {
    this.filter = formBuilder.group({
      choices: [['S', 'D', 'MX']],
    });
  }

  ngOnInit() {
    combineLatest([
      this.currentPage$,
      this.filter.valueChanges.pipe(
        startWith(this.filter.value),
        // reset the page when the filter changes
        tap(() => {
          this.currentPage$.next(1);
          this.endOfList = false;
          return this.recentGames$.next([]);
        })
      ),
    ])
      .pipe(
        shareReplay(1),
        takeUntil(this.destroy$),
        filter(() => !this.endOfList),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        mergeMap(([page, filter]) =>
          this._loadRecentGamesForPlayer(this.playerId ?? '', page, filter)
        )
        // Increment the page number for the next request
      )
      .subscribe((games) => {
        // Add the new items to the existing list
        const currentGames = this.recentGames$.getValue();
        this.recentGames$.next([...currentGames, ...games].sort(sortGames));
      });
  }

  ngAfterViewInit() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // The bottom of the current list is visible, load more items
          this.currentPage$.next(this.currentPage$.getValue() + 1);
        }
      });
    }, options);

    observer.observe(this.bottomObserver.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      !changes['playerId']?.currentValue ||
      !changes['playerId']?.previousValue
    ) {
      return;
    }

    // Reset the list when the playerId changes
    if (
      changes['playerId'].currentValue !== changes['playerId'].previousValue
    ) {
      this.endOfList = false;
      this.recentGames$.next([]);
      this.currentPage$.next(1);
    }
  }

  private _loadRecentGamesForPlayer(
    playerId: string,
    page: number,
    filter?: Partial<{ choices: string[] | null }>
  ) {
    return this.apollo
      .query<{
        player: {
          games: Partial<Game>[];
        };
      }>({
        query: gql`
          query Games(
            $id: ID!
            $where: JSONObject
            $take: Int
            $skip: Int
            $order: [SortOrderType!]
          ) {
            player(id: $id) {
              id
              games(where: $where, order: $order, take: $take, skip: $skip) {
                id
                playedAt
                gameType
                winner
                players {
                  id
                  slug
                  fullName
                  team
                  player
                  single
                  double
                  mix
                }
                rankingPoints {
                  id
                  differenceInLevel
                  points
                  playerId
                  system {
                    id
                    differenceForDowngrade
                    differenceForUpgrade
                  }
                }
                set1Team1
                set1Team2
                set2Team1
                set2Team2
                set3Team1
                set3Team2
                order
                competition {
                  id
                  drawCompetition {
                    name
                    id
                    subEventCompetition {
                      id
                      name
                      eventId
                    }
                  }

                  home {
                    id
                    name
                  }

                  away {
                    id
                    name
                  }
                }
                tournament {
                  name
                  subEventTournament {
                    name
                    id
                    eventTournament {
                      id
                      name
                    }
                  }
                  id
                }
              }
            }
          }
        `,
        variables: {
          id: playerId,
          where: {
            playedAt: {
              $lte: moment().format('YYYY-MM-DD'),
            },
            gameType: {
              $in: filter?.choices ?? ['S', 'D', 'MX'],
            },
          },
          order: [
            {
              direction: 'desc',
              field: 'playedAt',
            },
          ],
          skip: (page - 1) * this.itemsPerPage, // Skip the previous pages
          take: this.itemsPerPage, // Load only the current page
        },
      })
      .pipe(
        transferState(
          `recentGamesKey-${this.playerId}`,
          this.transferState,
          this.platformId
        ),
        map((result) => {
          return (
            result?.data.player?.games?.map((game) => new Game(game)) ?? []
          );
        }),
        tap((games) => {
          if (games.length < this.itemsPerPage) {
            // If the current page has less items than the page size, we've reached the end of the list
            this.endOfList = true;
          }
        })
      );
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRanking(game: Game, player: GamePlayer) {
    return player?.[this.getGameType(game.gameType ?? GameType.S)];
  }

  getWonStatusForPlayer(game: Game) {
    return (
      (game.winner == 1 && this.isTeamOfPlayer(game, 1)) ||
      (game.winner == 2 && this.isTeamOfPlayer(game, 2))
    );
  }

  isTeamOfPlayer(game: Game, team: number) {
    return game.players
      ?.filter((p) => p.team == team)
      ?.map((p) => p.id)
      ?.includes(this.playerId);
  }

  getPoints(game: Game, team: number) {
    let t1 = this.getPlayer(game, 1, team);
    if (!t1) {
      t1 = this.getPlayer(game, 2, team);
    }
    const won = game.winner == team;

    let tooltip = undefined;

    const rankingPoint = game.rankingPoints?.find((p) => p.playerId === t1?.id);
    const result = getGameResultType(won, rankingPoint);

    switch (result) {
      case GameBreakdownType.WON:
        tooltip = 'all.breakdown.usedForDowngrade';
        break;
      case GameBreakdownType.LOST_DOWNGRADE:
        tooltip = 'all.breakdown.usedForUpgrade';
        break;
      case GameBreakdownType.LOST_UPGRADE:
        tooltip = 'all.breakdown.usedForDowngrade';
        break;
      case GameBreakdownType.LOST_IGNORED:
        tooltip = 'all.breakdown.notUsed';
        break;
    }

    // return the highest points
    return {
      points: rankingPoint?.points,
      tooltip,
      upgrade: result === GameBreakdownType.LOST_UPGRADE,
      downgrade: result === GameBreakdownType.LOST_DOWNGRADE,
      show:
        result !== GameBreakdownType.LOST_IGNORED &&
        (rankingPoint?.points ?? -1) >= 0,
    };
  }

  getExtra(game: Game) {
    let title = '';
    let link: string[] = [];

    if (game.competition) {
      title += game.competition.drawCompetition?.name;
      if (game.competition.home?.name && game.competition.away?.name) {
        title += ` • ${game.competition.home?.name} vs ${game.competition.away?.name}`;
      }
      link = [
        '/competition',
        game.competition.drawCompetition?.subEventCompetition?.eventId ?? '',
        'draw',
        game.competition.drawCompetition?.id ?? '',
        'encounter',
        game.competition.id ?? '',
      ];
    } else if (game.tournament) {
      title += game.tournament?.subEventTournament?.eventTournament?.name;
      title += ` `;
      title += game.tournament?.name;
      link = [
        '/tournament',
        game.tournament?.subEventTournament?.eventTournament?.id ?? '',
        'draw',
        game.tournament?.id ?? '',
      ];
    }

    return {
      title,
      link,
    };
  }

  private getGameType(type: GameType) {
    switch (type) {
      case GameType.S:
        return 'single';
      case GameType.D:
        return 'double';
      case GameType.MX:
        return 'mix';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
