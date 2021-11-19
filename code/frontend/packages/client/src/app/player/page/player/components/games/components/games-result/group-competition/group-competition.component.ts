import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { CompetitionSubEvent, Player } from 'app/_shared';

@Component({
  selector: 'app-group-competition',
  templateUrl: './group-competition.component.html',
  styleUrls: ['./group-competition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupCompetitionComponent {
  @Input() subEvent!: CompetitionSubEvent;
  @Input() player!: Player;
}
