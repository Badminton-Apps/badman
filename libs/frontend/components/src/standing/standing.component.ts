
import { ChangeDetectionStrategy, Component, OnInit, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { EventEntry } from '@badman/frontend-models';
import { sortStanding } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'badman-standing',
  templateUrl: './standing.component.html',
  styleUrls: ['./standing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, RouterModule, MatTableModule, MatIconModule],
})
export class StandingComponent implements OnInit {
  entries = input.required<EventEntry[]>();
  entriesSignal = computed(() =>
    this.entries()
      .filter((e) => e.standing)
      .sort((a, b) => {
        // Since we filter for e.standing above, both a.standing and b.standing should exist
        if (!a.standing || !b.standing) return 0;
        return sortStanding(a.standing, b.standing);
      }),
  );

  type = input<'players' | 'team' | undefined>();

  displayedColumns!: string[];
  displayedColumnsHeaders!: string[];

  ngOnInit(): void {
    if (this.type() == 'players') {
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
      this.displayedColumnsHeaders = [
        'position',
        'name',
        'points',
        'played',
        'games',
        'sets',
        'totalPoints',
      ];
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
