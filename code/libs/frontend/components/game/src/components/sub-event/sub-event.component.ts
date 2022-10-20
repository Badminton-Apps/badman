import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  EncounterCompetition,
  Player,
  DrawTournament,
} from '@badman/frontend-models';

@Component({
  selector: 'badman-sub-event',
  templateUrl: './sub-event.component.html',
  styleUrls: ['./sub-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventComponent {
  @Input() competition?: EncounterCompetition;
  @Input() tournament?: DrawTournament;
  @Input() player?: Player;
}
