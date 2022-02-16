import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { CompetitionEncounter, CompetitionSubEvent, Game, Player } from 'app/_shared';

@Component({
  selector: 'app-group-competition',
  templateUrl: './group-competition.component.html',
  styleUrls: ['./group-competition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupCompetitionComponent implements OnInit {
  @Input() subEvent?: CompetitionSubEvent;
  @Input() encounter!: CompetitionEncounter;
  @Input() player!: Player;
  @Input() games?: Game[];

  ngOnInit(): void {
    this.games = (this.encounter.games ?? this.games)?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  }
}
