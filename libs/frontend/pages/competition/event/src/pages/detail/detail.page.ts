import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  Signal,
  signal,
  TransferState,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import { HasClaimComponent, PageHeaderComponent } from '@badman/frontend-components';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { BreadcrumbService } from 'xng-breadcrumb';
import { EditSubeventDialogComponent } from '../../dialogs';
import { EventMenuComponent } from '../../menus/event-menu/event-menu.component';
import { CompetitionEncountersComponent } from './competition-encounters';
import { CompetitionEncounterService } from './competition-encounters/competition-encounters.service';
import { CompetitionEnrollmentsComponent } from './competition-enrollments';
import { CompetitionMapComponent } from './competition-map';
import { toSignal } from '@angular/core/rxjs-interop';
import { Apollo } from 'apollo-angular';
import { EVENT_QUERY } from '../../queries';
import { transferState } from '@badman/frontend-utils';
import { map, tap } from 'rxjs';
import { injectParams } from 'ngxtension/inject-params';

@Component({
  selector: 'badman-competition-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    MomentModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatCardModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTabsModule,
    PageHeaderComponent,
    HasClaimComponent,
    CompetitionEnrollmentsComponent,
    CompetitionMapComponent,
    CompetitionEncountersComponent,
    EventMenuComponent,
  ],
})
export class DetailPageComponent {
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly breadcrumbsService = inject(BreadcrumbService);
  private readonly dialog = inject(MatDialog);
  private readonly claimService = inject(ClaimService);
  private apollo = inject(Apollo);

  private readonly competitionEncounterService = inject(CompetitionEncounterService);
  private readonly stateTransfer = inject(TransferState);
  private readonly platformId = inject<string>(PLATFORM_ID);
  readonly eventId = injectParams('id') as Signal<string>;

  // signals
  currentTab = signal(0);

  readonly eventCompetition = toSignal(
    this.apollo
      .watchQuery<{ eventCompetition: Partial<EventCompetition> }>({
        query: EVENT_QUERY,
        variables: {
          id: this.eventId(),
        },
      })
      .valueChanges.pipe(
        transferState(`eventKey-${this.eventId()}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.eventCompetition) {
            throw new Error('No event found!');
          }
          return new EventCompetition(result.data.eventCompetition);
        }),
      ),
  );
  private readonly quaryTab = injectQueryParams('tab');

  hasPermission = computed(() => this.claimService.hasAnyClaims(['edit-any:club']));
  canViewEnrollments = computed(() =>
    this.claimService.hasAnyClaims([
      'view-any:enrollment-competition',
      `${this.eventCompetition()?.id}_view:enrollment-competition`,
    ]),
  );

  subEvents = computed(() =>
    this.eventCompetition()
      ?.subEventCompetitions?.sort(sortSubEvents)
      ?.reduce(
        (acc, subEventCompetition) => {
          const eventType = subEventCompetition.eventType ?? 'Unknown';
          const subEvents = acc.find((x) => x.eventType === eventType)?.subEvents;
          if (subEvents) {
            subEvents.push(subEventCompetition);
          } else {
            acc.push({ eventType, subEvents: [subEventCompetition] });
          }
          return acc;
        },
        [] as { eventType: string; subEvents: SubEventCompetition[] }[],
      ),
  );

  constructor() {
    effect(() => {
      if (!this.eventCompetition()?.id) {
        return;
      }

      this.competitionEncounterService.filter.patchValue({
        eventId: this.eventCompetition()?.id,
      });

      const eventCompetitionName = `${this.eventCompetition()?.name}`;
      this.seoService.update({
        title: eventCompetitionName,
        description: `Competition ${eventCompetitionName}`,
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);
    });

    effect(() => {
      // if the canViewEnrollments is loaded
      if (this.canViewEnrollments?.() !== undefined) {
        const queryParam = this.quaryTab();
        if (queryParam) {
          this.currentTab.set(parseInt(queryParam, 10));
        }
      }
    });
  }

  setTab(index: number) {
    this.currentTab.set(index);
    this.router.navigate([], {
      queryParams: {
        tab: index === 0 ? undefined : index,
      },
      queryParamsHandling: 'merge',
    });
  }

  editSubEvent(subEvent: SubEventCompetition) {
    const dialogRef = this.dialog.open(EditSubeventDialogComponent, {
      width: '500px',
      data: { subEvent },
    });

    dialogRef.afterClosed().subscribe();
  }
}
