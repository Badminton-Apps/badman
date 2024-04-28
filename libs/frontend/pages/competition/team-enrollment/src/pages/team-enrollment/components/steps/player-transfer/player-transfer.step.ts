import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';

@Component({
  selector: 'badman-player-transfer-step',
  standalone: true,
  imports: [CommonModule, MatListModule],
  templateUrl: './player-transfer.step.html',
  styleUrls: ['./player-transfer.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTransferStepComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);

  transfers = this.dataService.state.transfers;
}
