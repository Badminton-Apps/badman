import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Club, Player, Team } from '../../../../../_shared';

@Component({
  selector: 'badman-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditTeamComponent implements OnInit {
  @Output() onPlayerAdded = new EventEmitter<Player>();
  @Output() onPlayerRemoved = new EventEmitter<Player>();

  @Input()
  club!: Club;

  @Input()
  team!: Team;

  players?: Player[];
  teamIndex?: number;

  where!: { [key: string]: unknown};

  ngOnInit(): void {
    if (!this.team.entries){
      throw new Error('Team has no entries');
    }

    this.teamIndex = this.team.entries[0].meta?.competition?.teamIndex;
    this.players = this.team.entries[0].meta?.competition?.players.map((p) => new Player(p.player));

    this.where = {
      gender: this.team.type == 'MX' || this.team.type == 'NATIONAL' ? undefined : this.team.type,
    };
  }
}
