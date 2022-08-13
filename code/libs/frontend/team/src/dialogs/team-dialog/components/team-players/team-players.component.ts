import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Club, Player, Team } from '@badman/frontend/shared';

@Component({
  selector: 'badman-team-players',
  templateUrl: './team-players.component.html',
  styleUrls: ['./team-players.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersComponent implements OnInit {
  @Output() whenPlayerAdded = new EventEmitter<Player>();
  @Output() whenPlayerRemoved = new EventEmitter<Player>();
  @Output() whenPlayerUpdated = new EventEmitter<Player>();

  @Input()
  team!: Team;

  @Input()
  club!: Club;

  @Input()
  disableIds: string[] | null = [];

  where!: { [key: string]: unknown };

  baseComplete = false;

  ngOnInit() {
    this.checkIfBaseComplete();
    this.where = {
      gender:
        this.team.type == 'MX' || this.team.type == 'NATIONAL'
          ? undefined
          : this.team.type,
    };
  }

  playerRemoved(player: Player) {
    this.whenPlayerRemoved.next(player);
  }

  playerAdded(player: Player) {
    this.whenPlayerAdded.next(player);
  }

  clicked(player: Player, checked: boolean) {
    player.base = checked;
    this.checkIfBaseComplete();
    this.whenPlayerUpdated.next(player);
  }

  private checkIfBaseComplete() {
    this.baseComplete =
      this.team?.players?.filter((p) => p.base).length >= 8 ?? false;
  }
}
