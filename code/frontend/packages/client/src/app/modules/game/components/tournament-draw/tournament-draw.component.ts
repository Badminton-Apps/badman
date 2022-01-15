import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { TournamentDraw } from 'app/_shared';

@Component({
  selector: 'app-tournament-draw',
  templateUrl: './tournament-draw.component.html',
  styleUrls: ['./tournament-draw.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDrawComponent implements OnInit {
  @Input() draw!: TournamentDraw;

  constructor() {}

  ngOnInit(): void {
  }
}
