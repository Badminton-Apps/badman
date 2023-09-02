import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
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
export class TeamAssemblyPlayerComponent implements OnInit {
  @Input()
  player!: Player;

  @Input()
  eventType?: string;

  @Input()
  showType!: string;

  ranking!: string;

  @Input()
  levelException?: boolean;

  ngOnInit() {
    if (!this.showType) {
      if (this.eventType == 'M' || this.eventType == 'F') {
        this.ranking = `${this.player.lastRanking?.single ?? 12} - ${
          this.player.lastRanking?.double ?? 12
        }`;
      } else {
        this.ranking = `${this.player.lastRanking?.single ?? 12} - ${
          this.player.lastRanking?.double ?? 12
        } - ${this.player.lastRanking?.mix ?? 12}`;
      }
    } else {
      if (this.showType.includes('single')) {
        this.ranking = `${this.player.lastRanking?.single ?? 12}`;
      } else if (
        this.eventType == 'MX' &&
        (this.showType == 'double3' || this.showType == 'double4')
      ) {
        this.ranking = `${this.player.lastRanking?.mix ?? 12}`;
      } else {
        this.ranking = `${this.player.lastRanking?.double ?? 12}`;
      }
    }
  }
}
