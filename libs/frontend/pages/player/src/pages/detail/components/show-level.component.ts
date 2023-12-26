import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowLevelService } from './show-level.service';
import { RankingSystemService } from '@badman/frontend-graphql';

@Component({
  selector: 'badman-show-level',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './show-level.component.html',
  styleUrl: './show-level.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowLevelComponent implements OnInit {
  showLevelService = inject(ShowLevelService);
  rankingService = inject(RankingSystemService);
  injector = inject(Injector);

  @Input({ required: true })
  playerId!: string;

  @Input({ required: true })
  type!: 'single' | 'double' | 'mix';

  upgrade!: 'singlePoints' | 'doublePoints' | 'mixPoints';
  downgrade!:
    | 'singlePointsDowngrade'
    | 'doublePointsDowngrade'
    | 'mixPointsDowngrade';

  canUpgrade = false;
  canDowngrade = false;

  ngOnInit() {
    this.showLevelService.state.getRanking({
      id: this.playerId,
      systemId: this.rankingService.systemId()!,
    });

    this.upgrade = `${this.type}Points`;
    this.downgrade = `${this.type}PointsDowngrade`;

    effect(() => this.canUpgradeOrDowngrade(), {
      injector: this.injector,
    });
  }

  canUpgradeOrDowngrade() {
    const level =
      this.showLevelService.rankingPlace()?.[this.type] ??
      this.rankingService.system()?.amountOfLevels ??
      12;

    const nextLevel =
      this.rankingService.system()!.pointsToGoUp?.[
        (this.rankingService.system()!.amountOfLevels ?? 12) - level
      ];

    const prevLevel =
      this.rankingService.system()!.pointsToGoDown?.[
        (this.rankingService.system()!.amountOfLevels ?? 12) - (level + 1)
      ];

    this.canUpgrade =
      (this.showLevelService.rankingPlace()?.[this.upgrade] ?? 0) >=
      (nextLevel ?? 0);
    this.canDowngrade =
      (this.showLevelService.rankingPlace()?.[this.downgrade] ?? 0) <=
      (prevLevel ?? 0);
  }
}
