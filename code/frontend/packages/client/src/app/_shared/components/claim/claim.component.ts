import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { UserService } from 'app/player';
import { Claim } from 'app/_shared/models';
import { ClaimService } from 'app/_shared/services/security/claim.service';

@Component({
  selector: 'app-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimComponent {
  @Input()
  claim: Claim;

  @Output()
  onChange = new EventEmitter<boolean>()
}
