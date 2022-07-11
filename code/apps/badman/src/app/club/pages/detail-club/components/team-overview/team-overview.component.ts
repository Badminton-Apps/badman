import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Team } from '../../../../../_shared';

@Component({
  selector: 'badman-team-overview',
  templateUrl: './team-overview.component.html',
  styleUrls: ['./team-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamOverviewComponent {
  @Output() whenEdit = new EventEmitter<Team>();
  @Output() whenActiveChange = new EventEmitter<{
    team: Team;
    active: boolean;
  }>();
  @Output() whenDelete = new EventEmitter<Team>();

  @Input()
  team!: Team;

  @Input()
  club!: Club;
}
