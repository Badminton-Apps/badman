import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import {
  Game,
  Player,
  TournamentDraw,
  TournamentSubEvent,
} from '../../../../../_shared';

@Component({
  selector: 'badman-group-tournament',
  templateUrl: './group-tournament.component.html',
  styleUrls: ['./group-tournament.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTournamentComponent {
  @Input() subEvent!: TournamentSubEvent;
  @Input() draw!: TournamentDraw;
  @Input() player!: Player;
  @Input() games?: Game[];

  // ngOnInit(): void {
  // TODO: write order logic
  // this.games = this.games?.sort((a, b) => (a.r ?? 0) - (b.order ?? 0));
  //}
}
