import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { CompetitionEncounter, Player, TournamentDraw } from 'app/_shared';

@Component({
  selector: 'app-sub-event',
  templateUrl: './sub-event.component.html',
  styleUrls: ['./sub-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventComponent {
  @Input() competition?: CompetitionEncounter;
  @Input() tournament?: TournamentDraw;
  @Input() player?: Player;


  
}
