import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { SelectPlayerSignalsComponent } from '@badman/frontend-components';
import { ClubMembershipType } from '@badman/utils';
import { TRANSFERS_LOANS } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'badman-player-transfer-step',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TranslateModule,
    SelectPlayerSignalsComponent,
  ],
  templateUrl: './player-transfer.step.html',
  styleUrls: ['./player-transfer.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTransferStepComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly change = inject(ChangeDetectorRef);

  club = this.dataService.state.club;
  loaded = this.dataService.state.loadedTeams;
  transfers = this.dataService.state.transfers;
  loans = this.dataService.state.loans;
  formGroup = input.required<FormGroup>();

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

  newTransfer = signal<string | null>(null);
  newLoan = signal<string | null>(null);

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

  addTransfer() {
    const player = this.newTransfer();

    if (!player) {
      return;
    }

    // add the transfer to the list
    this.transfersControl().setValue([...this.transfersControl().value, player]);

    // reset the new transfer
    this.newTransfer.set(null);
  }

  addLoan() {
    const player = this.newLoan();

    if (!player) {
      return;
    }

    // add the loan to the list
    this.loansControl().setValue([...this.loansControl().value, player]);

    this.newLoan.set(null);
  }
}