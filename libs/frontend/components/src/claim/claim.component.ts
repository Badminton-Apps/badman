import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Claim } from '@badman/frontend-models';

@Component({
  selector: 'badman-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule],
})
export class ClaimComponent {
  @Input()
  claim!: Claim;

  @Input()
  value!: boolean;

  @Output()
  whenChange = new EventEmitter<boolean>();
}
