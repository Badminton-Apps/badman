import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RankingSystemService } from '@badman/frontend-graphql';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RankingTableService } from './ranking-table.service';

@Component({
  selector: 'badman-ranking-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, MtxGrid],
  templateUrl: './ranking-table.component.html',
  styleUrls: ['./ranking-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingTableComponent {
  private readonly rankingSystemService = inject(RankingSystemService);
  private readonly rankingTableService = inject(RankingTableService);
  private readonly translate = inject(TranslateService);
  id = input<string | null>(null);

  columns: MtxGridColumn[] = [
    { header: this.translate.stream('all.faq.points.table.level'), field: 'level' },
    {
      header: this.translate.stream('all.faq.points.table.points-needed-up'),
      field: 'pointsToGoUp',
    },
    {
      header: this.translate.stream('all.faq.points.table.points-needed-down'),
      field: 'pointsToGoDown',
    },
    {
      header: this.translate.stream('all.faq.points.table.points-won'),
      field: 'pointsWhenWinningAgainst',
    },
  ];

  dataSource = this.rankingTableService.state.table;
  loaded = this.rankingTableService.state.loaded;

  constructor() {
    effect(() => {
      if (this.id()) {
        this.rankingTableService.filter.patchValue({ systemId: this.id() });
      } else {
        this.rankingTableService.filter.patchValue({
          systemId: this.rankingSystemService.systemId(),
        });
      }
    });
  }
}
