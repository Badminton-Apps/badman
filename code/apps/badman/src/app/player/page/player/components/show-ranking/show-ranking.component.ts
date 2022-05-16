import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
import { RankingPlace, RankingSystem } from '../../../../../_shared';

@Component({
  selector: 'badman-show-ranking',
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
  type!: 'single' | 'double' | 'mix';

  @Input()
  systems?: RankingSystem[];

  nextUp: 'upgrade' | 'downgrade' | 'same' = 'same';

  ngOnInit(): void {
    if (this.systems && this.rankingPlace) {
      const usedSystem = this.systems.find(
        (s) => s.id === this.rankingPlace?.rankingSystem?.id
      );
      const level = this.rankingPlace[this.type];
      const raningPlace = this.rankingPlace[`${this.type}Points`] ?? 0;

      if (
        !usedSystem ||
        !usedSystem?.pointsToGoDown ||
        !usedSystem.pointsToGoUp ||
        !usedSystem.amountOfLevels
      ) {
        throw new Error('No system found');
      }

      // we can go up
      if (usedSystem && level && level !== 1) {
        const poitnsNeeded =
          usedSystem.pointsToGoUp[usedSystem.amountOfLevels - level];
        if (raningPlace >= poitnsNeeded) {
          this.nextUp = 'upgrade';
        }
      }

      // we can go down
      if (usedSystem && level && level == usedSystem.amountOfLevels) {
        const poitnsNeeded =
          usedSystem.pointsToGoDown[usedSystem.amountOfLevels - level - 1];

        if (raningPlace < poitnsNeeded) {
          this.nextUp = 'downgrade';
        }
      }
    }
  }
}
