import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  TransferState,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  LoadingBlockComponent,
  RecentGamesComponent,
  UpcomingGamesComponent
} from '@badman/frontend-components';
import { Team } from '@badman/frontend-models';
import { DEVICE } from '@badman/frontend-utils';
import { SubEventTypeEnum } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { startWith, takeUntil } from 'rxjs/operators';
import { ClubTeamsService } from './club-teams.service';

@Component({
  selector: 'badman-club-teams',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingBlockComponent,
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatButtonToggleModule,
    HasClaimComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './club-teams.component.html',
  styleUrls: ['./club-teams.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTeamsComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);
  clubTeamsService = inject(ClubTeamsService);
  isHandset = inject(DEVICE);
  private destroy$ = injectDestroy();

  // Inputs
  clubId = input.required<string>();
  filter = input.required<FormGroup>();

  // Outputs
  whenTeamEdit = output<void>();
  whenTeamAdd = output<void>();

  // Other
  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    effect(() => {
      this.clubTeamsService.filter.patchValue({
        clubId: this.clubId(),
      });
    });
  }

  ngOnInit(): void {
    this.filter()
      ?.valueChanges.pipe(startWith(this.filter()?.value), takeUntil(this.destroy$))
      .subscribe((newValue) => {
        this.clubTeamsService.filter.patchValue({
          season: newValue.season,
        });
      });
  }

  editTeam(team: Team) {
    console.log(this.clubTeamsService.locations());

    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.EditDialogComponent, {
          data: {
            team: team,
            teamNumbers: {
              [team.type ?? 'M']: this.clubTeamsService
                .teams?.()
                ?.filter((t) => t.type == team.type)
                ?.map((t) => t.teamNumber),
            },
            locations: this.clubTeamsService.locations(),
          },

          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.whenTeamEdit.emit();
        });
    });
  }

  addTeam() {
    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.AddDialogComponent, {
          data: {
            team: {
              clubId: this.clubId(),
              season: this.filter()?.value.season,
            },
            teamNumbers: {
              [SubEventTypeEnum.M]: this.clubTeamsService
                .teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.M)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.F]: this.clubTeamsService
                .teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.F)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.MX]: this.clubTeamsService
                .teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.MX)
                ?.map((t) => t.teamNumber),
              [SubEventTypeEnum.NATIONAL]: this.clubTeamsService
                .teams?.()
                ?.filter((t) => t.type == SubEventTypeEnum.NATIONAL)
                ?.map((t) => t.teamNumber),
            },
            locations: this.clubTeamsService.locations(),
          },
          disableClose: true,
          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.whenTeamAdd.emit();
        });
    });
  }
}
