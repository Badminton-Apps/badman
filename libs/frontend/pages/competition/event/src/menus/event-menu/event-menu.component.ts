import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  TemplateRef,
} from '@angular/core';
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
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  OpenCloseChangeEncounterDateDialogComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { CpService } from '@badman/frontend-cp';
import { ExcelService } from '@badman/frontend-excel';
import { EventCompetition } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom, take } from 'rxjs';

@Component({
  selector: 'badman-event-menu',
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
    HasClaimComponent,
  ],
  templateUrl: './event-menu.component.html',
  styleUrl: './event-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventMenuComponent {
  eventCompetition = input.required<EventCompetition>();

  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);
  private matSnackBar = inject(MatSnackBar);
  private jobsService = inject(JobsService);
  private cpService = inject(CpService);
  private excelService = inject(ExcelService);
  private router = inject(Router);

  copyYearControl = new FormControl();

  constructor() {
    effect(() => {
      this.copyYearControl.setValue(
        (this.eventCompetition()?.season ?? new Date().getFullYear()) + 1,
      );
    });
  }

  async syncEvent() {
    const visualCode = this.eventCompetition()?.visualCode;
    if (!visualCode) {
      return;
    }

    await lastValueFrom(this.jobsService.syncEventById({ id: visualCode }));
  }

  reCalculatePoints() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation RecalculateEventCompetitionRankingPoints($eventId: ID!) {
            recalculateEventCompetitionRankingPoints(eventId: $eventId)
          }
        `,
        variables: {
          eventId: this.eventCompetition()?.id,
        },
      })
      .pipe(take(1))
      .subscribe();
  }

  reCalculateStanding() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation RecalculateStandingEvent($eventId: ID!) {
            recalculateStandingEvent(eventId: $eventId)
          }
        `,
        variables: {
          eventId: this.eventCompetition()?.id,
        },
      })
      .pipe(take(1))
      .subscribe();
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
        changeCloseDatePeriod1: this.eventCompetition()?.changeCloseDatePeriod1,
        changeCloseDatePeriod2: this.eventCompetition()?.changeCloseDatePeriod2,
        changeCloseRequestDatePeriod1: this.eventCompetition()?.changeCloseRequestDatePeriod1,
        changeCloseRequestDatePeriod2: this.eventCompetition()?.changeCloseRequestDatePeriod2,
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
        eventCompetition.changeCloseDatePeriod1 = result.changeCloseDatePeriod1;
        eventCompetition.changeCloseDatePeriod2 = result.changeCloseDatePeriod2;
        eventCompetition.changeCloseRequestDatePeriod1 = result.changeCloseRequestDatePeriod1;
        eventCompetition.changeCloseRequestDatePeriod2 = result.changeCloseRequestDatePeriod2;

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
                changeCloseDatePeriod1: eventCompetition.changeCloseDatePeriod1,
                changeCloseDatePeriod2: eventCompetition.changeCloseDatePeriod2,
                changeCloseRequestDatePeriod1: eventCompetition.changeCloseRequestDatePeriod1,
                changeCloseRequestDatePeriod2: eventCompetition.changeCloseRequestDatePeriod2,
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

  async downloadBasePlayers() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.excelService.getBaseplayersEnrollment(event));
  }

  async downloadTeamsExport() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.excelService.getTeamsExport(event));
  }

  async downloadExceptionsExport() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.excelService.getExceptionsExport(event));
  }

  async downloadLocationsExport() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.excelService.getLocationsExport(event));
  }

  async downloadCpFile() {
    const event = this.eventCompetition();
    if (!event) {
      return;
    }

    await lastValueFrom(this.cpService.downloadCp(event));
  }
}
