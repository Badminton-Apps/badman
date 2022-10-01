import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Club, Player, Team } from '@badman/frontend/models';

@Component({
  selector: 'badman-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditTeamComponent implements OnInit {
  @Output() whenPlayerAdded = new EventEmitter<Partial<Player>>();
  @Output() whenPlayerRemoved = new EventEmitter<Partial<Player>>();

  @Input()
  club!: Club;

  @Input()
  team!: Team;

  players?: (Partial<Player> & {
    single: number;
    double: number;
    mix: number;
  })[];
  teamIndex?: number;

  where!: { [key: string]: unknown };

  ngOnInit(): void {
    if (!this.team.entries) {
      throw new Error('Team has no entries');
    }

    this.teamIndex = this.team.entries[0].meta?.competition?.teamIndex;
    this.players = this.team.entries[0].meta?.competition?.players.map((p) => {
      const player = new Player(p.player) as Partial<Player> & {
        single: number;
        double: number;
        mix: number;
      };
      player.single = p.single;
      player.double = p.double;
      player.mix = p.mix;

      return player;
    });

    this.where = {
      gender:
        this.team.type == 'MX' || this.team.type == 'NATIONAL'
          ? undefined
          : this.team.type,
    };
  }
}
