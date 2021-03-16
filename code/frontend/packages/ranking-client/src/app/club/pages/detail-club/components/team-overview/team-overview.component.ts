import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Team } from 'app/_shared';

@Component({
  selector: 'app-team-overview',
  templateUrl: './team-overview.component.html',
  styleUrls: ['./team-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamOverviewComponent {
  @Output() onEdit = new EventEmitter<Team>();
  @Output() onDeactivate = new EventEmitter<Team>();
  @Output() onDelete = new EventEmitter<Team>();

  @Input()
  team: Team;

  @Input()
  club: Club;
}
