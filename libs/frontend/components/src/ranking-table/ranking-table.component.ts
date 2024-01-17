import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs';

@Component({
  selector: 'badman-ranking-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatTableModule],
  templateUrl: './ranking-table.component.html',
  styleUrls: ['./ranking-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingTableComponent implements OnInit {
  private readonly rankingSystemService = inject(RankingSystemService);
  private readonly apollo = inject(Apollo);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  @Input()
  id: string | null = null;

  displayedColumns = ['level', 'pointsToGoUp', 'pointsToGoDown', 'pointsWhenWinningAgainst'];

  system = this.rankingSystemService.system as Signal<RankingSystem>;

  ngOnInit() {
    if (this.id !== null) {
      this.system = toSignal(this._loadRanking(this.id), {
        injector: this.injector,
      }) as Signal<RankingSystem>;
    }
  }

  dataSource = computed(() => {
    if (!this.system()) {
      return [];
    }

    let level = this.system().amountOfLevels ?? 0;
    return this.system().pointsWhenWinningAgainst?.map((winning: number, index: number) => {
      return {
        level: level--,
        pointsToGoUp: level !== 0 ? Math.round(this.system().pointsToGoUp?.[index] ?? 0) : null,
        pointsToGoDown: index === 0 ? null : Math.round(this.system().pointsToGoDown?.[index - 1] ?? 0),
        pointsWhenWinningAgainst: Math.round(winning),
      } as RankingScoreTable;
    });
  }) as () => RankingScoreTable[];

  _loadRanking(systemId: string | null) {
    {
      return this.apollo
        .query<{
          rankingSystem: Partial<RankingSystem>;
        }>({
          query: gql`
            query GetSystemForTable($id: ID) {
              rankingSystem(id: $id) {
                id
                name
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
                pointsWhenWinningAgainst
                calculationLastUpdate
                primary
              }
            }
          `,
          variables: {
            id: systemId,
          },
        })
        .pipe(
          transferState('rankingKey-' + systemId, this.transferState, this.platformId),
          map((result) => {
            if (!result?.data.rankingSystem) {
              throw new Error('No player');
            }
            return new RankingSystem(result.data.rankingSystem);
          }),
          first(),
        );
    }
  }
}

type RankingScoreTable = {
  level: number;
  pointsToGoUp: number;
  pointsToGoDown: number;
  pointsWhenWinningAgainst: number;
};
