import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
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
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  OpenCloseDateDialogComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { EventTournament, SubEventTournament } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { AssignRankingGroupsComponent } from '../../components';

@Component({
  selector: 'badman-tournament-detail',
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
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class DetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly apollo = inject(Apollo);
  private readonly jobsService = inject(JobsService);
  private readonly dialog = inject(MatDialog);
  private readonly matSnackBar = inject(MatSnackBar);

  private routeData = toSignal(this.route.data);

  eventTournament = computed(() => this.routeData()?.['eventTournament'] as EventTournament);

  subEvents = computed(() => {
    return this.eventTournament()
      .subEventTournaments?.sort(sortSubEvents)
      ?.reduce(
        (acc, subEventTournament) => {
          const eventType = subEventTournament.eventType || 'Unknown';
          const subEvents = acc.find((x) => x.eventType === eventType)?.subEvents;
          if (subEvents) {
            subEvents.push(subEventTournament);
          } else {
            acc.push({ eventType, subEvents: [subEventTournament] });
          }
          return acc;
        },
        [] as { eventType: string; subEvents: SubEventTournament[] }[],
      );
  });

  constructor() {
    effect(() => {
      const eventTournamentName = `${this.eventTournament().name}`;

      this.seoService.update({
        title: eventTournamentName,
        description: `Tournament ${eventTournamentName}`,
        type: 'website',
        keywords: ['event', 'tournament', 'badminton'],
      });
      this.breadcrumbService.set('@eventTournament', eventTournamentName);
    });
  }

  setOpenClose() {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: {
        openDate: this.eventTournament().openDate,
        closeDate: this.eventTournament().closeDate,
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.eventTournament().openDate = result.openDate;
        this.eventTournament().closeDate = result.closeDate;

        this.apollo
          .mutate({
            mutation: gql`
              mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
                updateEventTournament(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: this.eventTournament().id,
                openDate: this.eventTournament().openDate,
                closeDate: this.eventTournament().closeDate,
              },
            },
          })
          .subscribe(() => {
            this.matSnackBar.open(
              `Tournament ${this.eventTournament().name} open/close dates updated`,
              'Close',
              {
                duration: 2000,
              },
            );
          });
      }
    });
  }

  makeOfficial() {
    this.eventTournament().official = !this.eventTournament().official;
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
            updateEventTournament(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: this.eventTournament().id,
            official: this.eventTournament().official,
          },
        },
      })
      .subscribe(() => {
        this.matSnackBar.open(
          `Tournament ${this.eventTournament().name} is ${this.eventTournament().official ? 'official' : 'unofficial'}`,
          'Close',
          {
            duration: 2000,
          },
        );
      });
  }

  async syncEvent() {
    if (!this.eventTournament().visualCode) {
      this.matSnackBar.open(
        `Tournament ${this.eventTournament().name} has no visual code, add it via the "add event" button in the overview page.`,
        'Close',
        {
          duration: 2000,
        },
      );

      return;
    }

    await lastValueFrom(
      this.jobsService.syncEventById({ id: this.eventTournament().visualCode as string }),
    );
  }

  assignRankingGroups() {
    this.dialog
      .open(AssignRankingGroupsComponent, {
        minWidth: '50vw',
        maxHeight: '80vh',
        data: {
          event: this.eventTournament,
        },
      })
      .afterClosed()
      .subscribe(() => {
        //
      });
  }

  removeEvent() {
    const dialogData = new ConfirmDialogModel(
      'all.tournament.delete.title',
      'all.tournament.delete.description',
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
            mutation RemoveTournament($id: ID!) {
              removeEventTournament(id: $id)
            }
          `,
          variables: {
            id: this.eventTournament().id,
          },
          refetchQueries: ['EventTournament'],
        })
        .subscribe(() => {
          this.matSnackBar.open('Deleted', undefined, {
            duration: 1000,
            panelClass: 'success',
          });
          this.router.navigate(['/tournament']);
        });
    });
  }
}
