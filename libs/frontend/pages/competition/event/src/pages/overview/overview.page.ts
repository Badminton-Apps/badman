import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AddEventComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-jobs';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { CompetitionEventsComponent } from './competition-events/competition-events.component';

@Component({
  selector: 'badman-competition-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    MomentModule,

    // Material Modules
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,

    // Own components
    PageHeaderComponent,
    HasClaimComponent,
    CompetitionEventsComponent,
  ],
})
export class OverviewPageComponent implements OnInit {
  // injects
  apollo = inject(Apollo);

  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  route = inject(ActivatedRoute);
  router = inject(Router);

  formBuilder = inject(FormBuilder);
  jobsService = inject(JobsService);

  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  // signals
  seasons?: Signal<number[]>;
  currentTab = signal(0);

  // other
  filter!: FormGroup;

  ngOnInit(): void {
    this.filter = this.formBuilder.group({
      season: getCurrentSeason(),
    });

    this._setYears();

    // check if the query params contian tabindex
    this.route.queryParams
      .pipe(
        take(1),
        filter((params) => params['tab']),
        map((params) => params['tab'])
      )
      .subscribe((tabindex) => {
        this.currentTab.set(parseInt(tabindex, 10));
      });
  }

  private _setYears() {
    this.seasons = toSignal(
      this.apollo
        .query<{
          eventCompetitionSeasons: number[];
        }>({
          query: gql`
            query CompetitionYearsCompetition {
              eventCompetitionSeasons
            }
          `,
        })
        .pipe(
          transferState(
            `eventCompetitions-seasons`,
            this.stateTransfer,
            this.platformId
          ),
          map((result) => {
            if (!result?.data.eventCompetitionSeasons) {
              throw new Error('No teams');
            }
            return result.data.eventCompetitionSeasons;
          })
        ),
      {
        initialValue: [getCurrentSeason()],
        injector: this.injector,
      }
    );
  }

  async addEvent() {
    const dialogRef = this.dialog.open(AddEventComponent, {
      width: '400px',
    });

    const result = await lastValueFrom(dialogRef.afterClosed());
    if (result?.url) {
      await lastValueFrom(this.jobsService.syncEventById(result));
    }
  }
}
