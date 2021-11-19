import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { Player, TournamentSubEvent } from 'app/_shared';

@Component({
  selector: 'app-group-tournament',
  templateUrl: './group-tournament.component.html',
  styleUrls: ['./group-tournament.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTournamentComponent {
  @Input() subEvent!: TournamentSubEvent;
  @Input() player!: Player;
}
