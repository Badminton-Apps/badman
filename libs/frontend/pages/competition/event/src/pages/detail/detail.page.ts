import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  Signal,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  HasClaimComponent,
  OpenCloseChangeEncounterDateDialogComponent,
  OpenCloseDateDialogComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { CpService } from '@badman/frontend-cp';
import { ExcelService } from '@badman/frontend-excel';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { JobsService } from '@badman/frontend-queue';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { combineLatest, lastValueFrom } from 'rxjs';
import { filter, map, startWith, take, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CompetitionEncountersComponent } from './competition-encounters/competition-encounters.component';
import { CompetitionEnrollmentsComponent } from './competition-enrollments';
import { CompetitionMapComponent } from './competition-map';
import { injectDestroy } from 'ngxtension/inject-destroy';

@Component({
  selector: 'badman-competition-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,
    TranslateModule,

    MomentModule,

    // Material Modules
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

    // Own modules
    PageHeaderComponent,
    HasClaimComponent,
    CompetitionEnrollmentsComponent,
    CompetitionMapComponent,
    CompetitionEncountersComponent,
  ],
})
export class DetailPageComponent implements OnInit {
  // injectors
  private authService = inject(ClaimService);
  private injector = inject(Injector);
  private claimService = inject(ClaimService);
  private versionInfo: {
    beta: boolean;
    version: string;
  } = inject(VERSION_INFO);
  private destroy$ = injectDestroy();

  // signals
  canViewEnrollments?: Signal<boolean | undefined>;
  currentTab = signal(0);

  hasPermission = toSignal(this.claimService.hasAnyClaims$(['edit-any:club']));

  canViewEncounter = computed(
    () => this.hasPermission() || this.versionInfo.beta,
  );
  copyYearControl = new FormControl();

  eventCompetition!: EventCompetition;
  subEvents?: { eventType: string; subEvents: SubEventCompetition[] }[];

  constructor(
    private seoService: SeoService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar,
    private jobsService: JobsService,
    private cpService: CpService,
    private excelService: ExcelService,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.data,
      this.translate.get(['all.competition.title']),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, translations]) => {
        this.eventCompetition = data['eventCompetition'];
        this.subEvents = this.eventCompetition.subEventCompetitions
          ?.sort(sortSubEvents)
          ?.reduce(
            (acc, subEventCompetition) => {
              const eventType = subEventCompetition.eventType || 'Unknown';
              const subEvents = acc.find((x) => x.eventType === eventType)
                ?.subEvents;
              if (subEvents) {
                subEvents.push(subEventCompetition);
              } else {
                acc.push({ eventType, subEvents: [subEventCompetition] });
              }
              return acc;
            },
            [] as { eventType: string; subEvents: SubEventCompetition[] }[],
          );

        const eventCompetitionName = `${this.eventCompetition.name}`;
        this.copyYearControl.setValue(
          (this.eventCompetition.season || new Date().getFullYear()) + 1,
        );

        this.seoService.update({
          title: eventCompetitionName,
          description: `Club ${eventCompetitionName}`,
          type: 'website',
          keywords: ['event', 'competition', 'badminton'],
        });
        this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);
        this.breadcrumbsService.set(
          'competition',
          translations['all.competition.title'],
        );

        this.canViewEnrollments = toSignal(
          this.authService.hasAnyClaims$([
            'view-any:enrollment-competition',
            `${this.eventCompetition.id}_view:enrollment-competition`,
          ]),
          { injector: this.injector },
        );

        effect(
          () => {
            // if the canViewEnrollments is loaded
            if (this.canViewEnrollments?.() !== undefined) {
              // check if the query params contian tabindex
              this.route.queryParams
                .pipe(
                  startWith(this.route.snapshot.queryParams),
                  take(1),
                  filter((params) => params['tab']),
                  map((params) => params['tab']),
                )
                .subscribe((tabindex) => {
                  this.currentTab.set(parseInt(tabindex, 10));
                });
            }
          },
          { injector: this.injector, allowSignalWrites: true },
        );
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
          id: this.eventCompetition.id,
          year,
        },
      }),
    );

    this.router.navigate([
      '/competition',
      result.data?.copyEventCompetition?.slug,
    ]);
  }

  setOpenCloseEnrollents() {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: {
        openDate: this.eventCompetition.openDate,
        closeDate: this.eventCompetition.closeDate,
        title: 'all.competition.menu.open_close_enrollments',
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.eventCompetition.openDate = result.openDate;
        this.eventCompetition.closeDate = result.closeDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventCompetition(
                $data: EventCompetitionUpdateInput!
              ) {
                updateEventCompetition(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: this.eventCompetition.id,
                openDate: this.eventCompetition.openDate,
                closeDate: this.eventCompetition.closeDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Competition ${this.eventCompetition.name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              },
            );
          });
      }
    });
  }

  setOpenCloseChangeEncounters() {
    // open dialog
    const ref = this.dialog.open(OpenCloseChangeEncounterDateDialogComponent, {
      data: {
        openDate: this.eventCompetition.changeOpenDate,
        closeDate: this.eventCompetition.changeCloseDate,
        requestDate: this.eventCompetition.changeCloseRequestDate,
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.eventCompetition.changeOpenDate = result.openDate;
        this.eventCompetition.changeCloseDate = result.closeDate;
        this.eventCompetition.changeCloseRequestDate = result.requestDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventCompetition(
                $data: EventCompetitionUpdateInput!
              ) {
                updateEventCompetition(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: this.eventCompetition.id,
                changeOpenDate: this.eventCompetition.changeOpenDate,
                changeCloseDate: this.eventCompetition.changeCloseDate,
                changeCloseRequestDate:
                  this.eventCompetition.changeCloseRequestDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Competition ${this.eventCompetition.name} open/close dates updated`,
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
            id: this.eventCompetition.id,
            official: offical,
          },
        },
      })
      .subscribe(() => {
        this.matSnackBar.open(
          `Competition ${this.eventCompetition.name} is ${
            offical ? 'official' : 'unofficial'
          }`,
          'Close',
          {
            duration: 2000,
          },
        );
        this.eventCompetition.official = offical;
      });
  }

  async syncEvent() {
    if (!this.eventCompetition.visualCode) {
      return;
    }

    await lastValueFrom(
      this.jobsService.syncEventById({ id: this.eventCompetition.visualCode }),
    );
  }

  async downloadCpFile() {
    await lastValueFrom(this.cpService.downloadCp(this.eventCompetition));
  }

  async downloadBasePlayers() {
    await lastValueFrom(
      this.excelService.getBaseplayersEnrollment(this.eventCompetition),
    );
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
