import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { EventEntry } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-standing',
  templateUrl: './standing.component.html',
  styleUrls: ['./standing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule, MatTableModule, MatIconModule],
})
export class StandingComponent implements OnInit {
  @Input()
  entries!: EventEntry[];

  @Input()
  type!: 'players' | 'team';

  displayedColumns!: string[];
  displayedColumnsHeaders!: string[];

  ngOnInit(): void {
    // Filter out those without standing
    this.entries = this.entries.filter((e) => e.standing);

    // Sort by postion
    this.entries?.sort((a, b) => (a.standing?.position ?? 0) - (b.standing?.position ?? 0));

    if (this.type == 'players') {
      this.displayedColumns = [
        'position',
        'promotion',
        'name',
        'points',
        'played',
        'gamesWon',
        'gamesLost',
        'setsWon',
        'setsLost',
        'totalPointsWon',
        'totalPointsLost',
      ];
      this.displayedColumnsHeaders = ['position', 'name', 'points', 'played', 'games', 'sets', 'totalPoints'];
    } else {
      this.displayedColumns = [
        'position',
        'promotion',
        'name',
        'points',
        'played',
        'won',
        'tied',
        'lost',
        'gamesWon',
        'gamesLost',
        'setsWon',
        'setsLost',
        'totalPointsWon',
        'totalPointsLost',
      ];
      this.displayedColumnsHeaders = [
        'position',
        'name',
        'points',
        'played',
        'won',
        'tied',
        'lost',
        'games',
        'sets',
        'totalPoints',
      ];
    }
  }
}
