import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Team } from 'app/_shared';

@Component({
  selector: 'app-team-overview',
  templateUrl: './team-overview.component.html',
  styleUrls: ['./team-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamOverviewComponent {
  @Input()
  team: Team;
}
