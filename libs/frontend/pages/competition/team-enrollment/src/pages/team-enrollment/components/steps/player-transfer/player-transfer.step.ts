import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectPlayerSignalsComponent } from '@badman/frontend-components';
import { Player } from '@badman/frontend-models';
import { ClubMembershipType } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { TRANSFERS_LOANS } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';

@Component({
    selector: 'badman-player-transfer-step',
    imports: [
        CommonModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatDialogModule,
        TranslatePipe,
        SelectPlayerSignalsComponent,
    ],
    templateUrl: './player-transfer.step.html',
    styleUrls: ['./player-transfer.step.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerTransferStepComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly change = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);

  club = this.dataService.state.club;
  loaded = this.dataService.state.loadedTeams;
  transfers = this.dataService.state.transfers;
  loans = this.dataService.state.loans;
  formGroup = input.required<FormGroup>();

  newPlayerTmpl = viewChild.required<TemplateRef<HTMLElement>>('addPlayer');

  lockedTransfers = computed(
    () =>
      this.transfers()
        ?.filter((player) => player.clubMembership.confirmed)
        ?.map((player) => player.id) ?? [],
  );

  lockedLoans = computed(
    () =>
      this.loans()
        ?.filter((player) => player.clubMembership.confirmed)
        ?.map((player) => player.id) ?? [],
  );

  transfersLoans = computed(
    () =>
      this.formGroup().get(TRANSFERS_LOANS) as FormGroup<{
        [key in ClubMembershipType]: FormControl<string[]>;
      }>,
  );
  transfersControl = computed(
    () => this.transfersLoans().get(ClubMembershipType.NORMAL) as FormControl<string[]>,
  );
  loansControl = computed(
    () => this.transfersLoans().get(ClubMembershipType.LOAN) as FormControl<string[]>,
  );

  newPlayerId = signal<string | null>(null);

  constructor() {
    // set initial controls and update when club changes
    effect(() => {
      // get club
      const club = this.club();

      // wait for teams to be loaded, and also reload when anything changes
      if (!this.loaded() || !club?.id) {
        return;
      }

      // use the state but don't update effect when it changes
      untracked(() => {
        this.transfersControl().setValue(this.transfers()?.map((player) => player.id));
        this.loansControl().setValue(this.loans()?.map((player) => player.id));

        this.change.detectChanges();
      });
    });
  }

  removeTransfer(id: string) {
    const transfers = this.transfersControl().value;
    const index = transfers.indexOf(id);
    transfers.splice(index, 1);
    this.transfersControl().setValue(transfers);
  }

  removeLoan(id: string) {
    const loans = this.loansControl().value;
    const index = loans.indexOf(id);
    loans.splice(index, 1);
    this.loansControl().setValue(loans);
  }

  addNewPlayer(type: 'transfer' | 'loan') {
    this.dialog
      .open(this.newPlayerTmpl(), {
        minWidth: '500px',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const player = this.newPlayerId();

        if (!player) {
          return;
        }

        if (type === 'transfer') {
          // add the transfer to the list
          this.transfersControl().setValue([...this.transfersControl().value, player]);
        } else if (type === 'loan') {
          // add the loan to the list
          this.loansControl().setValue([...this.loansControl().value, player]);
        }

        // reset the new transfer
        this.newPlayerId.set(null);

        // update the view
        this.change.detectChanges();
      });
  }

  newPlayerFilter(results: Player[]) {
    // filter out players that are already in the list
    const transfers = this.transfersControl().value;
    results = results.filter((player) => !transfers.includes(player.id));

    const loans = this.loansControl().value;
    results = results.filter((player) => !loans.includes(player.id));

    // filter out where active club contains is the current club
    results = results.filter((player) => {
      const activeClubs = player.clubs?.filter(
        (club) => (club.clubMembership?.active ?? false) == true,
      );
      // console.log('results', activeClubs, this.club());
      if (activeClubs?.length === 1) {
        // don't show the player if they are already in the club
        if (activeClubs[0].id === this.club()?.id) {
          return false;
        }
      }
      return true;
    });

    return results;
  }
}
