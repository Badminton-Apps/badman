import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import {
  BadmanBlockModule,
  LoadingBlockComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { EventCompetition } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { TranslatePipe } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';
import { RisersFallersDialogComponent } from '../../../dialogs';
import { EventMenuComponent } from '../../../menus/event-menu/event-menu.component';
import { EventOverviewService } from '../overview.service';

@Component({
  selector: 'badman-competition-events',
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    EventMenuComponent,
    LoadingBlockComponent,
    BadmanBlockModule,
  ],
  templateUrl: './competition-events.component.html',
  styleUrls: ['./competition-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionEventsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly eventService = inject(EventOverviewService);
  private readonly jobsService = inject(JobsService);

  loading = this.eventService.loading;
  events = this.eventService.events;

  setRisersFallers(competition: EventCompetition) {
    // open dialog
    this.dialog.open(RisersFallersDialogComponent, {
      data: { event: competition },
    });
  }

  setOpenClose(competition: EventCompetition) {
    // open dialog
    const ref = this.dialog.open(OpenCloseDateDialogComponent, {
      data: {
        openDate: competition.openDate,
        closeDate: competition.closeDate,
        season: competition.season,
      },
      width: '400px',
      disableClose: true,
    });

    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.eventService.state.updateEvent({
          id: competition.id,
          openDate: result.openDate,
          closeDate: result.closeDate,
        });
      }
    });
  }

  async makeOfficial(competition: EventCompetition, official: boolean) {
    await this.eventService.state.updateEvent({
      id: competition.id,
      official,
    });
  }

  async syncEvent(competition: EventCompetition) {
    if (!competition.visualCode) {
      console.warn('No visual code');
      return;
    }

    await lastValueFrom(this.jobsService.syncEventById({ id: competition.visualCode }));
  }
}
