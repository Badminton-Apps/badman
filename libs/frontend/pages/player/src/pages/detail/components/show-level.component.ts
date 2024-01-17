import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, effect, inject, Signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RankingSystemService } from '@badman/frontend-graphql';
import { TranslateService } from '@ngx-translate/core';
import { ShowLevelService } from './show-level.service';

@Component({
  selector: 'badman-show-level',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './show-level.component.html',
  styleUrl: './show-level.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowLevelComponent implements OnInit {
  showLevelService = inject(ShowLevelService);
  private readonly rankingService = inject(RankingSystemService);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  @Input({ required: true })
  playerId!: Signal<string>;

  @Input({ required: true })
  type!: 'single' | 'double' | 'mix';

  upgrade!: 'singlePoints' | 'doublePoints' | 'mixPoints';
  downgrade!: 'singlePointsDowngrade' | 'doublePointsDowngrade' | 'mixPointsDowngrade';

  tooltip = '';

  canUpgrade = false;
  canDowngrade = false;

  ngOnInit() {
    effect(
      () => {
        this.showLevelService.state.getRanking({
          id: this.playerId(),
          systemId: this.rankingService.systemId()!,
        });
      },
      {
        injector: this.injector,
      },
    );

    this.upgrade = `${this.type}Points`;
    this.downgrade = `${this.type}PointsDowngrade`;

    effect(() => this.canUpgradeOrDowngrade(), {
      injector: this.injector,
    });
  }

  canUpgradeOrDowngrade() {
    this.tooltip = '';
    const maxLevel = this.rankingService.system()?.amountOfLevels ?? 12;

    const level = this.showLevelService.rankingPlace()?.[this.type] ?? maxLevel;

    const nextLevel = level == 1 ? undefined : this.rankingService.system()!.pointsToGoUp?.[maxLevel - level];

    const prevLevel = this.rankingService.system()!.pointsToGoDown?.[maxLevel - (level + 1)];

    this.canUpgrade =
      level == 1 ? false : (this.showLevelService.rankingPlace()?.[this.upgrade] ?? 0) >= (nextLevel ?? -1);
    this.canDowngrade =
      level == maxLevel ? false : (this.showLevelService.rankingPlace()?.[this.downgrade] ?? 0) <= (prevLevel ?? -1);

    if (nextLevel) {
      this.tooltip = `${this.translate.instant('all.breakdown.upgrade')}: > ${nextLevel}`;
    }

    if (prevLevel && nextLevel) {
      this.tooltip += '\n';
    }

    if (prevLevel) {
      this.tooltip += `${this.translate.instant('all.breakdown.downgrade')}: < ${prevLevel}`;
    }
  }
}
