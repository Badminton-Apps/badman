import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
// import { TranslateModule } from '@ngx-translate/core';
import { DataService } from './ranking-table.service';

@Component({
  selector: 'badman-ranking-table',
  standalone: true,
  imports: [
    CommonModule,
    // TranslateModule,
    MatTableModule,
    MatProgressBarModule,
  ],
  templateUrl: './ranking-table.component.html',
  styleUrls: ['./ranking-table.component.scss'],
})
export class RankingTableComponent {
  displayedColumns: (keyof RankingScoreTable)[] = [
    'level',
    'pointsToGoUp',
    'pointsToGoDown',
    'pointsWhenWinningAgainst',
  ];
  private readonly dataService = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private routeParams = toSignal(this.route.paramMap);

  systemId = computed(() => this.routeParams()?.get('id'));
  system = this.dataService.system;
  loaded = this.dataService.loaded;

  dataSource = computed(() => {
    const system = this.system();
    if (!system) {
      return [];
    }

    let level = system.amountOfLevels ?? 0;
    return system.pointsWhenWinningAgainst?.map(
      (winning: number, index: number) => {
        return {
          level: level--,
          pointsToGoUp:
            level !== 0 ? Math.round(system.pointsToGoUp?.[index] ?? 0) : null,
          pointsToGoDown:
            index === 0
              ? null
              : Math.round(system.pointsToGoDown?.[index - 1] ?? 0),
          pointsWhenWinningAgainst: Math.round(winning),
        } as RankingScoreTable;
      },
    );
  }) as () => RankingScoreTable[];

  constructor() {
    effect(() => {
      const id = this.systemId();
      if (!id) {
        return;
      }
      this.dataService.filter.get('systemId')?.setValue(id);
    });
  }
}

type RankingScoreTable = {
  level: number;
  pointsToGoUp: number;
  pointsToGoDown: number;
  pointsWhenWinningAgainst: number;
};
