import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  OpenCloseDateDialogComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { JobsModule, JobsService } from '@badman/frontend-jobs';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { combineLatest, lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

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

    // Own modules
    PageHeaderComponent,
    JobsModule,
    HasClaimComponent,
  ],
})
export class DetailPageComponent implements OnInit {
  eventCompetition!: EventCompetition;
  subEvents?: { eventType: string; subEvents: SubEventCompetition[] }[];

  copyYearControl = new FormControl();

  constructor(
    private seoService: SeoService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar,
    private jobsService: JobsService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.data,
      this.translate.get(['all.competition.title']),
    ]).subscribe(([data, translations]) => {
      this.eventCompetition = data['eventCompetition'];
      this.subEvents = this.eventCompetition.subEventCompetitions
        ?.sort(sortSubEvents)
        ?.reduce((acc, subEventCompetition) => {
          const eventType = subEventCompetition.eventType || 'Unknown';
          const subEvents = acc.find(
            (x) => x.eventType === eventType
          )?.subEvents;
          if (subEvents) {
            subEvents.push(subEventCompetition);
          } else {
            acc.push({ eventType, subEvents: [subEventCompetition] });
          }
          return acc;
        }, [] as { eventType: string; subEvents: SubEventCompetition[] }[]);

      const eventCompetitionName = `${this.eventCompetition.name}`;
      this.copyYearControl.setValue(
        (this.eventCompetition.season || new Date().getFullYear()) + 1
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
        translations['all.competition.title']
      );
    });
  }

  async copy(templateRef: TemplateRef<object>) {
    const year = await lastValueFrom(
      this.dialog
        .open(templateRef, {
          width: '300px',
        })
        .afterClosed()
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
      })
    );

    this.router.navigate([
      '/competition',
      result.data?.copyEventCompetition?.slug,
    ]);
  }

  setOpenClose() {
     // open dialog
     const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: { event: this.eventCompetition },
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
              }
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
          }
        );
      });
  }

  async syncEvent() {
    if (!this.eventCompetition.visualCode) {
      return;
    }

    await lastValueFrom(
      this.jobsService.syncEventById({ id: this.eventCompetition.visualCode })
    );
  }
}
