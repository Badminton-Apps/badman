import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import {
  BadmanBlockModule,
  HasClaimComponent,
  LoadingBlockComponent,
  OpenCloseDateDialogComponent,
} from '@badman/frontend-components';
import { EventCompetition } from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';
import { RisersFallersDialogComponent } from '../../../dialogs';
import { EventOverviewService } from '../overview.service';

@Component({
  selector: 'badman-competition-events',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    HasClaimComponent,
    LoadingBlockComponent,
    BadmanBlockModule,
  ],
  templateUrl: './competition-events.component.html',
  styleUrls: ['./competition-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionEventsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
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
      data: { event: competition },
      width: '400px',
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
