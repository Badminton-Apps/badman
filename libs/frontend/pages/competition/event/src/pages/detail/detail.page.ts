import { CommonModule } from '@angular/common';
import { Component, TemplateRef, computed, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  OpenCloseChangeEncounterDateDialogComponent,
  OpenCloseDateDialogComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { CpService } from '@badman/frontend-cp';
import { ExcelService } from '@badman/frontend-excel';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CompetitionEncountersComponent } from './competition-encounters';
import { CompetitionEncounterService } from './competition-encounters/competition-encounters.service';
import { CompetitionEnrollmentsComponent } from './competition-enrollments';
import { CompetitionMapComponent } from './competition-map';
import { EventMenuComponent } from '../../menus/event-menu/event-menu.component';

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
    CompetitionEnrollmentsComponent,
    CompetitionMapComponent,
    CompetitionEncountersComponent,
    EventMenuComponent,
  ],
})
export class DetailPageComponent {
  private seoService = inject(SeoService);
  private router = inject(Router);
  private breadcrumbsService = inject(BreadcrumbService);

  // injectors
  private claimService = inject(ClaimService);

  private readonly competitionEncounterService = inject(CompetitionEncounterService);

  // signals
  currentTab = signal(0);

  readonly eventCompetition = injectRouteData<EventCompetition>('eventCompetition');
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
}
