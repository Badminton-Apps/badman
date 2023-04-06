import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'badman-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations.step.html',
  styleUrls: ['./locations.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsStepComponent {}
