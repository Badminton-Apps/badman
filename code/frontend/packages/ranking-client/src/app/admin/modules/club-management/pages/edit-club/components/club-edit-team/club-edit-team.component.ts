import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Player, Team } from 'app/_shared';

@Component({
  selector: 'app-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditTeamComponent {
  @Output() onPlayerAdded = new EventEmitter<Player>();
  @Output() onPlayerRemoved = new EventEmitter<Player>();

  @Input()
  team: Team;

  @Input()
  club: Club;
}
