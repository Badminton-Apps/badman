import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Player } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-assembly-player',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatIconModule, MatTooltipModule],
  templateUrl: './team-assembly-player.component.html',
  styleUrls: ['./team-assembly-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamAssemblyPlayerComponent {
  player = input.required<Player>();
  eventType = input.required<string>();
  showType = input<string>();
  levelException = input.required<boolean>();
  ranking = computed(() => {
    if (!this.showType()) {
      if (this.eventType() == 'M' || this.eventType() == 'F') {
        return `${this.player().lastRanking?.single ?? 12} - ${
          this.player().lastRanking?.double ?? 12
        }`;
      } else {
        return `${this.player().lastRanking?.single ?? 12} - ${
          this.player().lastRanking?.double ?? 12
        } - ${this.player().lastRanking?.mix ?? 12}`;
      }
    } else {
      if (this.showType()?.includes('single')) {
        return `${this.player().lastRanking?.single ?? 12}`;
      } else if (
        this.eventType() == 'MX' &&
        (this.showType() == 'double3' || this.showType() == 'double4')
      ) {
        return `${this.player().lastRanking?.mix ?? 12}`;
      } else {
        return `${this.player().lastRanking?.double ?? 12}`;
      }
    }
  });
}
