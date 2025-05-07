import { CommonModule } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  TemplateRef,
  TransferState,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { EventEntry, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { getSeason } from '@badman/utils';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { map, takeUntil } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    templateUrl: './detail.page.html',
    styleUrls: ['./detail.page.scss'],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        TranslatePipe,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        RecentGamesComponent,
        UpcomingGamesComponent,
        PageHeaderComponent,
        MatDialogModule,
    ]
})
export class DetailPageComponent {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private dialog = inject(MatDialog);
  private snackbar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);
  private translate = inject(TranslateService);
  private destroy$ = injectDestroy();

  calendarTmpl = viewChild.required<TemplateRef<HTMLElement>>('calendar');

  // route

  team = injectRouteData<Team>('team');

  entry = signal<EventEntry | null>(null);

  constructor() {
    effect(() => {
      const teamName = `${this.team()?.name}`;
      const clubName = `${this.team()?.club?.name}`;

      this.seoService.update({
        title: teamName,
        description: `Team ${teamName}`,
        type: 'website',
        keywords: ['team', 'badminton'],
      });
      this.breadcrumbService.set('club/:id', clubName);
      this.breadcrumbService.set('club/:id/team/:id', teamName);

      this._loadEntry();
    });
  }

  private _loadEntry() {
    const year = getSeason();
    this.apollo
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
                drawCompetition {
                  id
                }
                subEventCompetition {
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
          teamId: this.team()?.id,
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        transferState(
          `teamEntries-${this.team()?.id}-${year}`,
          this.stateTransfer,
          this.platformId,
        ),
        map((result) => {
          if (!result?.data?.team?.entry) {
            return undefined;
          }

          return new EventEntry(result?.data?.team?.entry as Partial<EventEntry>);
        }),
      )
      .subscribe((entry) => {
        if (!entry) {
          return;
        }

        this.entry.set(entry);
      });
  }

  showCalendar() {
    this.dialog.open(this.calendarTmpl(), {
      panelClass: 'calendar-dialog',
      maxWidth: '500px',
    });
  }

  copyToClipboard(id?: string, type?: 'team' | 'link') {
    if (!id || !type) {
      return;
    }

    // create url to the ical
    const url = `${window.location.origin}/api/v1/calendar/team?${type}Id=${id}`;
    this.clipboard.copy(url);

    this.snackbar.open(this.translate.instant('all.player.ical.copied'), 'X', {
      duration: 2000,
    });
  }
}
