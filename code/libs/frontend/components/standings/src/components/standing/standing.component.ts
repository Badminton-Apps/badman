import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
import { Entry } from '@badman/frontend/models';

@Component({
  selector: 'badman-standing',
  templateUrl: './standing.component.html',
  styleUrls: ['./standing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StandingComponent implements OnInit {
  @Input()
  entries!: Entry[];

  @Input()
  type!: 'players' | 'team';

  displayedColumns!: string[];
  displayedColumnsHeaders!: string[];

  ngOnInit(): void {
    // Filter out those without standing
    this.entries = this.entries.filter((e) => e.standing);
    
    // Sort by postion
    this.entries?.sort(
      (a, b) => (a.standing?.position ?? 0) - (b.standing?.position ?? 0)
    );

    if (this.type == 'players') {
      this.displayedColumns = [
        'position',
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
