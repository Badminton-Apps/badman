import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Claim } from '../../models';

@Component({
  selector: 'badman-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimComponent {
  @Input()
  claim!: Claim;

  @Output()
  onChange = new EventEmitter<boolean>();
}
