import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'badman-show-level',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './show-level.component.html',
  styleUrl: './show-level.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowLevelComponent {
  @Input()
  playerId: string | null = null;

}
