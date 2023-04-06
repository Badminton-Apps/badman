import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { PlayerSearchComponent } from '@badman/frontend-components';
import { Club, Player, Team } from '@badman/frontend-models';

@Component({
  selector: 'badman-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,

    // Other modules
    MatListModule,
    MatIconModule,
    MatButtonModule,

    // My Modules
    PlayerSearchComponent,
  ],
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
    if (!this.team.entry) {
      throw new Error('Team has no entries');
    }

    this.teamIndex = this.team.entry.meta?.competition?.teamIndex;
    this.players = this.team.entry.meta?.competition?.players.map((p) => {
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
