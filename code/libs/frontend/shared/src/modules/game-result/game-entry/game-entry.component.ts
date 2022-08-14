import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'badman-game-entry',
  templateUrl: './game-entry.component.html',
  styleUrls: ['./game-entry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameEntryComponent {}
