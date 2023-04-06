import { CommonModule, isPlatformServer } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
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
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Game, GamePlayer } from '@badman/frontend-models';
import { GameBreakdownType, GameType, getGameResultType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

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
    MatIconModule
  ],
  selector: 'badman-list-games',
  templateUrl: './list-games.component.html',
  styleUrls: ['./list-games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGamesComponent implements OnInit, AfterViewInit {
  @Input() playerId?: string;

  filter: FormGroup<{
    choices: FormControl<string[] | null>;
  }>;

  currentPage = 1;
  itemsPerPage = 10;
  endOfList = false;

  recentGames$ = new BehaviorSubject<Game[]>([]); // start with an empty list
  loadMore$ = new Subject<void>();

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
          this.loadMore$.next();
        }
      });
    }, options);

    observer.observe(this.bottomObserver.nativeElement);
  }

  private _loadRecentGamesForPlayer(
    playerId: string,
    page: number,
    filter?: Partial<{ choices: string[] | null }>
  ) {
    const STATE_KEY = makeStateKey<Game[]>('recentGamesKey-' + this.playerId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((encounter) => new Game(encounter)));
    } else {
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
                $lte: moment().subtract(1, 'month').format('YYYY-MM-DD'),
              },
              gameType: filter?.choices,
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
          map((result) => {
            return result.data.player?.games?.map((game) => new Game(game));
          }),
          tap((games) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, games);
            }
          }),
          tap((games) => {
            if (games.length < this.itemsPerPage) {
              // If the current page has less items than the page size, we've reached the end of the list
              this.endOfList = true;
            }
          })
        );
    }
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRanking(game: Game, player: GamePlayer) {
    return player?.[this.getGameType(game.gameType ?? GameType.S)];
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
      points: rankingPoint?.points ?? 0,
      tooltip,
      upgrade: result === GameBreakdownType.LOST_UPGRADE,
      downgrade: result === GameBreakdownType.LOST_DOWNGRADE,
      show: result !== GameBreakdownType.LOST_IGNORED,
    };
  }

  getExtra(game: Game) {
    let title = '';
    let link: string[] = [];

    if (game.competition) {
      title += game.competition.drawCompetition?.name;
      title += ` • ${game.competition.home?.name} vs ${game.competition.away?.name}`;
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

  ngOnInit() {
    combineLatest([
      this.loadMore$,
      this.filter.valueChanges.pipe(
        startWith(this.filter.value),
        // reset the page when the filter changes
        tap(() => {
          this.currentPage = 1;
          this.endOfList = false;
          return this.recentGames$.next([]);
        })
      ),
    ]).subscribe(([, filter]) => {
      if (this.endOfList) {
        return;
      }
      // Increment the current page and load the next batch of items
      this.currentPage++;

      this._loadRecentGamesForPlayer(
        this.playerId ?? '',
        this.currentPage,
        filter
      ).subscribe((games) => {
        // Add the new items to the existing list
        const currentGames = this.recentGames$.getValue();
        this.recentGames$.next([...currentGames, ...games]);
      });
    });

    // Load the first batch of items
    this._loadRecentGamesForPlayer(
      this.playerId ?? '',
      this.currentPage,
      this.filter.value
    ).subscribe((games) => {
      this.recentGames$.next(games);
    });
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
}
