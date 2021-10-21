import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Club, Player, Team } from 'app/_shared';

@Component({
  selector: 'app-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditTeamComponent implements OnInit {
  @Output() onPlayerAdded = new EventEmitter<Player>();
  @Output() onPlayerRemoved = new EventEmitter<Player>();

  @Input()
  club: Club;

  @Input()
  team: Team;

  players: Player[];
  teamIndex: number;

  where: {};

  ngOnInit(): void {
    this.teamIndex = this.team.subEvents[0].meta.teamIndex;
    this.players = this.team.subEvents[0].meta.players.map((p) => new Player(p.player));

    this.where = {
      gender: this.team.type == 'MX' || this.team.type == 'NATIONAL' ? undefined : this.team.type,
    };
  }
}
