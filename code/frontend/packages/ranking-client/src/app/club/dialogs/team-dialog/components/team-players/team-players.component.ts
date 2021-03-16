import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Club, Player, Team } from 'app/_shared';

@Component({
  selector: 'app-team-players',
  templateUrl: './team-players.component.html',
  styleUrls: ['./team-players.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersComponent implements OnInit {
  @Output() onPlayerAdded = new EventEmitter<Player>();
  @Output() onPlayerRemoved = new EventEmitter<Player>();
  @Output() onPlayerUpdated = new EventEmitter<Player>();

  @Input()
  team: Team;

  @Input()
  club: Club;

  @Input()
  disableIds: string[] = [];

  where: {};

  baseComplete: boolean = false;

  ngOnInit() {
    this.checkIfBaseComplete();
    this.where = {
      gender: this.team.type == "MX" ? undefined : this.team.type
    }
  }

  playerRemoved(player: Player) {
    this.onPlayerRemoved.next(player);
  }

  playerAdded(player: Player) {
    this.onPlayerAdded.next(player);
  }

  clicked(player: Player, checked: boolean) {
    player.base = checked;
    this.checkIfBaseComplete();
    this.onPlayerUpdated.next(player);
  }

  private checkIfBaseComplete() {
    this.baseComplete = this.team.players.filter((p) => p.base).length >= 4;
  }
}
