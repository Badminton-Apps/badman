import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  CompetitionEncounter,
  Player,
  TournamentDraw,
} from '@badman/frontend/models';

@Component({
  selector: 'badman-sub-event',
  templateUrl: './sub-event.component.html',
  styleUrls: ['./sub-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventComponent {
  @Input() competition?: CompetitionEncounter;
  @Input() tournament?: TournamentDraw;
  @Input() player?: Player;
}
