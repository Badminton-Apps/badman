import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
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
import { Router, RouterModule } from '@angular/router';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  OpenCloseDateDialogComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { SubEventTournament } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { sortSubEvents } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { AssignRankingGroupsComponent } from '../../components';
import { TournamentDetailService } from './detail.service';
import { injectParams } from 'ngxtension/inject-params';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Apollo, gql } from 'apollo-angular';

@Component({
  selector: 'badman-tournament-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
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
    MatProgressBarModule,
  ],
})
export class DetailPageComponent {
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly jobsService = inject(JobsService);
  private readonly dialog = inject(MatDialog);
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly apollo = inject(Apollo);

  private readonly detailService = inject(TournamentDetailService);

  eventTournament = this.detailService.tournament;
  loaded = this.detailService.loaded;
  errors = this.detailService.error;
  private readonly eventId = injectParams('id');

  subEvents = computed(() => {
    return this.eventTournament()
      ?.subEventTournaments?.sort(sortSubEvents)
      ?.reduce(
        (acc, subEventTournament) => {
          const eventType = subEventTournament.eventType ?? 'Unknown';
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
      const eventId = this.eventId();

      if (!eventId) {
        return;
      }

      this.detailService.filter.patchValue({
        tournamentId: eventId,
      });
    });

    effect(() => {
      const eventTournamentName = `${this.eventTournament()?.name}`;

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
    if (!this.eventTournament()) {
      return;
    }

    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: {
        openDate: this.eventTournament()?.openDate,
        closeDate: this.eventTournament()?.closeDate,
      },
      width: '400px',
    });

    ref.afterClosed().subscribe(async (result) => {
      if (result?.openDate || result?.closeDate) {
        await this.detailService.state.setOpenCloseDates({
          openDate: result?.openDate,
          closeDate: result?.closeDate,
        });

        this.matSnackBar.open(
          `Tournament ${this.eventTournament()?.name} open/close dates updated`,
          'Close',
          {
            duration: 2000,
          },
        );
      }
    });
  }

  async makeOfficial() {
    await this.detailService.state.toggleOfficialStatus();

    this.matSnackBar.open(
      `Tournament ${this.eventTournament()?.name} is ${!this.eventTournament()?.official ? 'official' : 'unofficial'}`,
      'Close',
      {
        duration: 2000,
      },
    );
  }

  async syncEvent() {
    if (!this.eventTournament()?.visualCode) {
      this.matSnackBar.open(
        `Tournament ${this.eventTournament()?.name} has no visual code, add it via the "add event" button in the overview page.`,
        'Close',
        {
          duration: 2000,
        },
      );

      return;
    }

    this.apollo
      .mutate({
        mutation: gql`
          mutation SyncEvent($eventId: ID, $options: SyncEventOptions) {
            syncEvent(eventId: $eventId, options: $options)
          }
        `,
        variables: {
          eventId: this.eventTournament()?.id,
          options: {
            deleteEvent: true,
          },
        },
      })
      .subscribe();
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

    dialogRef.afterClosed().subscribe(async (dialogResult) => {
      if (!dialogResult) {
        return;
      }

      await this.detailService.state.removeTournament();

      this.matSnackBar.open('Deleted', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.router.navigate(['/tournament']);
    });
  }

  reCalculatePoints() {
    this.detailService.state.reCalculatePoints();
  }

  syncSubEvent() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation SyncSubEvent($subEventId: ID, $options: SyncSubEventOptions) {
            syncSubEvent(subEventId: $subEventId, options: $options)
          }
        `,
        variables: {
          subEventId: this.eventTournament()?.id,
          options: {
            deleteSubEvent: true,
          },
        },
      })
      .subscribe();
  }
}
