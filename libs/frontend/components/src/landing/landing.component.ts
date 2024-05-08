import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  TransferState,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthenticateService } from '@badman/frontend-auth';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { UpcomingGamesComponent } from '../games';
import { RankingTableComponent } from '../ranking-table';
import { BetaComponent } from './components';

@Component({
  selector: 'badman-landing',
  standalone: true,
  imports: [
    CommonModule,
    BetaComponent,
    TranslateModule,
    MatIconModule,
    UpcomingGamesComponent,
    RankingTableComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  // private
  private readonly apollo = inject(Apollo);
  private readonly seoService = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);
  private readonly stateTransfer = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authenticateService = inject(AuthenticateService);

  // public
  versionInfo = inject(VERSION_INFO);
  // inputs
  teams = signal<Team[]>([]);
  // computed
  hasTeams = computed(() => this.teams()?.length > 0);
  user = computed(() => this.authenticateService.user());
  loggedIn = computed(() => this.authenticateService.loggedIn());

  ngOnInit() {
    effect(
      () => {
        if (this.loggedIn()) {
          this._loadTeamsForPlayer();
        }

        this.translate.get(['all.landing.title']).subscribe((translations) => {
          const title = translations['all.landing.title'];
          this.seoService.update({
            title,
            description: title,
            type: 'website',
            keywords: ['badman', 'badminton'],
          });
        });
      },
      {
        // allowSignalWrites: true,
        injector: this.injector,
      },
    );
  }

  private _loadTeamsForPlayer() {
    this.apollo
      .query<{ player: { teams: Partial<Team>[] } }>({
        query: gql`
          query ClubsAndTeams($playerId: ID!) {
            player(id: $playerId) {
              id
              teams {
                id
                clubId
                teamMembership {
                  id
                  membershipType
                }
              }
            }
          }
        `,
        variables: {
          playerId: this.user()?.id,
        },
      })
      .pipe(
        map((result) => result.data.player.teams?.map((t) => new Team(t))),
        transferState(`ClubsAndTeams-${this.user()?.id}`, this.stateTransfer, this.platformId),
      )
      .subscribe((teams) => {
        if (!teams) {
          return;
        }

        this.teams.set(teams);
      });
  }
}
