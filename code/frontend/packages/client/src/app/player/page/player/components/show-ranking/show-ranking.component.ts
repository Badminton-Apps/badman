import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { RankingPlace, RankingSystem } from 'app/_shared';

@Component({
  selector: 'app-show-ranking',
  templateUrl: './show-ranking.component.html',
  styleUrls: ['./show-ranking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowRankingComponent implements OnInit {
  @Input()
  rankingPlace?: RankingPlace;

  @Input()
  viewingRankingPlace?: RankingPlace;

  @Input()
  type?: 'single' | 'double' | 'mix';

  @Input()
  systems?: RankingSystem[];

  nextUp: 'upgrade' | 'downgrade' | 'same' = 'same';

  constructor() {}

  ngOnInit(): void {
    if (this.systems) {
      const usedSystem = this.systems.find((s) => s.id === this.rankingPlace?.rankingSystem?.id)!;
      const level = this.rankingPlace![this.type!];

      // we can go up
      if (usedSystem && level && level !== 1) {
        const poitnsNeeded = usedSystem.pointsToGoUp![usedSystem.amountOfLevels! - level!];
        if (this.rankingPlace![`${this.type!}Points`!] >= poitnsNeeded) {
          this.nextUp = 'upgrade';
        }
      }

      // we can go down
      if (usedSystem && level && level !== usedSystem.amountOfLevels) {
        const poitnsNeeded = usedSystem.pointsToGoDown![usedSystem.amountOfLevels! - level! - 1];

        if (this.rankingPlace![`${this.type!}Points`!] < poitnsNeeded) {
          this.nextUp = 'downgrade';
        }
      }
    }
  }
}
