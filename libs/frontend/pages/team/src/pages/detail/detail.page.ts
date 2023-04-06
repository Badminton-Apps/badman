import { CommonModule, isPlatformServer } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent
} from '@badman/frontend-components';
import { EventEntry, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, of, tap } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
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

    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
  ],
})
export class DetailPageComponent implements OnInit {
  team!: Team;

  entries$?: Observable<EventEntry | undefined>;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.team = this.route.snapshot.data['team'];
    const teamName = `${this.team.name}`;

    this.seoService.update({
      title: teamName,
      description: `Team ${teamName}`,
      type: 'website',
      keywords: ['team', 'badminton'],
    });
    this.breadcrumbsService.set(
      'club/:id',
      this.route.snapshot.data['club'].name
    );
    this.breadcrumbsService.set('club/:id/team/:id', teamName);

    this.entries$ = this._latestEntry();
  }

  private _latestEntry() {
    const year = getCurrentSeason();
    const STATE_KEY = makeStateKey<EventEntry>(
      `teamEntries-${this.team.id}-${year}`
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, undefined);

      if (state) {
        this.transferState.remove(STATE_KEY);
      }

      return of(undefined);
    } else {
      return this.apollo
        .query<{ team: Partial<Team> }>({
          query: gql`
            query Entries($teamId: ID!) {
              team(id: $teamId) {
                id
                entry {
                  id
                  date
                  standing {
                    id
                    position
                    size
                  }
                  competitionDraw {
                    id
                  }
                  competitionSubEvent {
                    id
                    eventCompetition {
                      id
                      name
                      slug
                    }
                  }
                }
              }
            }
          `,
          variables: {
            teamId: this.team.id,
          },
        })
        .pipe(
          map((result) => new EventEntry(result.data.team.entry as EventEntry)),
          tap((teams) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, teams);
            }
          })
        );
    }
  }
}