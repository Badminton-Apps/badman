import { CommonModule, isPlatformServer } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Game, Player, RankingPlace, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'badman-player-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,

    // My Componments
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class DetailPageComponent implements OnInit, OnDestroy {
  player!: Player;
  initials?: string;

  destroy$ = new Subject<void>();

  teams$?: Observable<Team[]>;
  rankingPlaces$?: Observable<RankingPlace>;

  tooltip = {
    single: '',
    double: '',
    mix: '',
  };

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private transferState: TransferState,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.data,
      this.translate.get('all.ranking.single'),
      this.translate.get('all.ranking.double'),
      this.translate.get('all.ranking.mix'),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, single, double, mix]) => {
        this.player = data['player'];
        const lastNames = `${this.player.lastName}`.split(' ');
        if ((lastNames ?? []).length > 0) {
          this.initials = `${this.player.firstName?.[0]}${
            lastNames?.[lastNames.length - 1][0]
          }`.toUpperCase();
        }

        this.tooltip.single = single;
        this.tooltip.double = double;
        this.tooltip.mix = mix;
        

        this.seoService.update({
          title: `${this.player.fullName}`,
          description: `Player ${this.player.fullName}`,
          type: 'website',
          keywords: ['player', 'badminton'],
        });
        this.breadcrumbsService.set('player/:id', this.player.fullName);

        this.teams$ = this._loadTeamsForPlayer();
        this.rankingPlaces$ = this._loadRankingForPlayer();
      });
  }

  getPlayer(game: Game, player: number, team: number) {
    const playerInGame = game.players?.find(
      (p) => p.player === player && p.team === team
    );
    return playerInGame?.fullName || 'Unknown';
  }

  private _loadTeamsForPlayer() {
    const STATE_KEY = makeStateKey<Team[]>('teamsPlayer-' + this.player.id);

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((teams) => new Team(teams)));
    } else {
      return this.apollo
        .query<{ player: { teams: Partial<Team>[] } }>({
          query: gql`
            query ClubsAndTeams($playerId: ID!) {
              player(id: $playerId) {
                id
                teams {
                  id
                  clubId
                }
              }
            }
          `,
          variables: {
            playerId: this.player.id,
          },
        })
        .pipe(
          map((result) => result.data.player.teams?.map((t) => new Team(t))),
          tap((teams) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, teams);
            }
          })
        );
    }
  }

  private _loadRankingForPlayer() {
    const STATE_KEY = makeStateKey<RankingPlace>(
      'rankingPlayer-' + this.player.id
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, null);

      if (state) {
        return of(new RankingPlace(state));
      }

      return of();
    } else {
      return this.apollo
        .query<{ player: { rankingLastPlaces: Partial<RankingPlace>[] } }>({
          query: gql`
            query LastRankingPlace($playerId: ID!) {
              player(id: $playerId) {
                id
                rankingLastPlaces {
                  id
                  single
                  singlePoints
                  double
                  doublePoints
                  mix
                  mixPoints
                  rankingSystem {
                    id
                    primary
                  }
                }
              }
            }
          `,
          variables: {
            playerId: this.player.id,
          },
        })
        .pipe(
          map((result) => {
            if (result.data.player.rankingLastPlaces?.length > 0) {
              const findPrimary = result.data.player.rankingLastPlaces.find(
                (r) => r.rankingSystem?.primary
              );

              if (findPrimary) {
                return new RankingPlace(findPrimary);
              }

              return new RankingPlace(result.data.player.rankingLastPlaces[0]);
            }

            return {
              single: 12,
              double: 12,
              mix: 12,
            } as RankingPlace;
          }),
          tap((place) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, place);
            }
          })
        );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
