import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, computed, effect, inject, signal } from '@angular/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { combineLatest, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CompetitionEncountersComponent } from './competition-encounters';
import { CompetitionEncounterService } from './competition-encounters/competition-encounters.service';
import { CompetitionEnrollmentsComponent } from './competition-enrollments';
import { CompetitionMapComponent } from './competition-map';

@Component({
  selector: 'badman-competition-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
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
  ],
})
export class DetailPageComponent implements OnInit {
  private seoService = inject(SeoService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private breadcrumbsService = inject(BreadcrumbService);
  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);
  private matSnackBar = inject(MatSnackBar);
  private jobsService = inject(JobsService);
  private cpService = inject(CpService);
  private excelService = inject(ExcelService);
  // injectors
  private claimService = inject(ClaimService);

  private readonly competitionEncounterService = inject(CompetitionEncounterService);

  private destroy$ = injectDestroy();

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
  copyYearControl = new FormControl();

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

      this.copyYearControl.setValue(
        (this.eventCompetition()?.season ?? new Date().getFullYear()) + 1,
      );
    });

    effect(
      () => {
        // if the canViewEnrollments is loaded
        if (this.canViewEnrollments?.() !== undefined) {
          const queryParam = this.quaryTab();
          if (queryParam) {
            this.currentTab.set(parseInt(queryParam, 10));
          }
        }
      },
      {
        allowSignalWrites: true,
      },
    );
  }

  ngOnInit(): void {
    combineLatest([this.translate.get(['all.competition.title'])])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([translations]) => {
        const eventCompetitionName = `${this.eventCompetition()?.name}`;
        this.seoService.update({
          title: eventCompetitionName,
          description: `Competition ${eventCompetitionName}`,
          type: 'website',
          keywords: ['event', 'competition', 'badminton'],
        });
        this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);
        this.breadcrumbsService.set('competition', translations['all.competition.title']);
      });
  }

  async copy(templateRef: TemplateRef<object>) {
    const year = await lastValueFrom(
      this.dialog
        .open(templateRef, {
          width: '300px',
        })
        .afterClosed(),
    );

    if (!year) {
      return;
    }

    const result = await lastValueFrom(
      this.apollo.mutate<{ copyEventCompetition: Partial<EventCompetition> }>({
        mutation: gql`
          mutation CopyEventCompetition($id: ID!, $year: Int!) {
            copyEventCompetition(id: $id, year: $year) {
              id
              slug
            }
          }
        `,
        variables: {
          id: this.eventCompetition()?.id,
          year,
        },
      }),
    );

    this.router.navigate(['/competition', result.data?.copyEventCompetition?.slug]);
  }

  setOpenCloseEnrollents() {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: {
        openDate: this.eventCompetition()?.openDate,
        closeDate: this.eventCompetition()?.closeDate,
        season: this.eventCompetition()?.season,
        title: 'all.competition.menu.open_close_enrollments',
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        const event = this.eventCompetition();
        if (!event) {
          return;
        }

        event.openDate = result.openDate;
        event.closeDate = result.closeDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
                updateEventCompetition(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: event?.id,
                openDate: event?.openDate,
                closeDate: event?.closeDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(`Competition ${event?.name} open/close dates updated`, 'Close', {
              duration: 2000,
            });
          });
      }
    });
  }

  setOpenCloseChangeEncounters() {
    // open dialog
    const ref = this.dialog.open(OpenCloseChangeEncounterDateDialogComponent, {
      data: {
        openDate: this.eventCompetition()?.changeOpenDate,
        closeDate: this.eventCompetition()?.changeCloseDate,
        requestDate: this.eventCompetition()?.changeCloseRequestDate,
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        const eventCompetition = this.eventCompetition();

        if (!eventCompetition) {
          console.error('Event competition not found');
          return;
        }

        eventCompetition.changeOpenDate = result.openDate;
        eventCompetition.changeCloseDate = result.closeDate;
        eventCompetition.changeCloseRequestDate = result.requestDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
                updateEventCompetition(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: eventCompetition.id,
                changeOpenDate: eventCompetition.changeOpenDate,
                changeCloseDate: eventCompetition.changeCloseDate,
                changeCloseRequestDate: eventCompetition.changeCloseRequestDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Competition ${eventCompetition.name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              },
            );
          });
      }
    });
  }

  makeOfficial(offical: boolean) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
            updateEventCompetition(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: this.eventCompetition()?.id,
            official: offical,
          },
        },
      })
      .subscribe(() => {
        this.matSnackBar.open(
          `Competition ${this.eventCompetition()?.name} is ${offical ? 'official' : 'unofficial'}`,
          'Close',
          {
            duration: 2000,
          },
        );

        const eventCompetition = this.eventCompetition();

        if (!eventCompetition) {
          console.error('Event competition not found');
          return;
        }
        const event = this.eventCompetition();
        if (!event) {
          return;
        }

        event.official = offical;
      });
  }

  async syncEvent() {
    const visualCode = this.eventCompetition()?.visualCode;
    if (!visualCode) {
      return;
    }

    await lastValueFrom(this.jobsService.syncEventById({ id: visualCode }));
  }

  async downloadCpFile() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.cpService.downloadCp(event));
  }

  async downloadBasePlayers() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.excelService.getBaseplayersEnrollment(event));
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

  removeEvent() {
    const dialogData = new ConfirmDialogModel(
      'all.competition.delete.title',
      'all.competition.delete.description',
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '400px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (!dialogResult) {
        return;
      }

      this.apollo
        .mutate({
          mutation: gql`
            mutation RemoveCompetition($id: ID!) {
              removeEventCompetition(id: $id)
            }
          `,
          variables: {
            id: this.eventCompetition()?.id,
          },
          refetchQueries: ['EventCompetition'],
        })
        .subscribe(() => {
          this.matSnackBar.open('Deleted', undefined, {
            duration: 1000,
            panelClass: 'success',
          });
          this.router.navigate(['/competition']);
        });
    });
  }
}
