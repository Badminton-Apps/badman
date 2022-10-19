import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
import { RankingPlace, RankingSystem } from '@badman/frontend-models';

@Component({
  selector: 'badman-show-ranking',
  templateUrl: './show-ranking.component.html',
  styleUrls: ['./show-ranking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowRankingComponent implements OnInit {
  @Input()
  rankingPlace?: RankingPlace;

  inactive = false;
  points = 0;

  viewingInactive = false;
  viewingPoints = 0;

  @Input()
  viewingRankingPlace?: RankingPlace;

  @Input()
  type!: 'single' | 'double' | 'mix';

  @Input()
  systems?: RankingSystem[];

  nextUp: 'upgrade' | 'downgrade' | 'same' = 'same';

  usedSystem?: RankingSystem;

  ngOnInit(): void {
    if (this.systems) {
      if (this.rankingPlace) {
        this.usedSystem = this.systems.find(
          (s) => s.id === this.rankingPlace?.rankingSystem?.id
        );
        const level = this.rankingPlace[this.type];
        this.points = this.rankingPlace[`${this.type}Points`] ?? 0;
        this.inactive = this.rankingPlace[`${this.type}Inactive`] as boolean;
        if (this.viewingRankingPlace) {
          this.viewingPoints =
            this.viewingRankingPlace[`${this.type}Points`] ?? 0;
          this.viewingInactive = this.viewingRankingPlace[
            `${this.type}Inactive`
          ] as boolean;
        }

        if (
          !this.usedSystem ||
          !this.usedSystem?.pointsToGoDown ||
          !this.usedSystem.pointsToGoUp ||
          !this.usedSystem.amountOfLevels
        ) {
          throw new Error('No system found');
        }

        // we can go up
        if (this.usedSystem && level && level !== 1) {
          const poitnsNeeded =
            this.usedSystem.pointsToGoUp[
              this.usedSystem.amountOfLevels - level
            ];
          if (this.points >= poitnsNeeded) {
            this.nextUp = 'upgrade';
          }
        }

        // we can go down
        if (
          this.usedSystem &&
          level &&
          level == this.usedSystem.amountOfLevels
        ) {
          const poitnsNeeded =
            this.usedSystem.pointsToGoDown[
              this.usedSystem.amountOfLevels - level - 1
            ];

          if (this.points < poitnsNeeded) {
            this.nextUp = 'downgrade';
          }
        }
      } else {
        this.usedSystem = this.systems?.find((s) => s.primary);
      }
    }
  }
}
