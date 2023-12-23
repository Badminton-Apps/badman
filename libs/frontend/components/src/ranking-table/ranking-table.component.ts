import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, first, map, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'badman-ranking-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatTableModule],
  templateUrl: './ranking-table.component.html',
  styleUrls: ['./ranking-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingTableComponent implements OnInit {
  @Input()
  id = 'primary';

  dataSource = new MatTableDataSource<RankingScoreTable>();

  displayedColumns = [
    'level',
    'pointsToGoUp',
    'pointsToGoDown',
    'pointsWhenWinningAgainst',
  ];

  constructor(
    private apollo: Apollo,
    private raningSystemService: RankingSystemService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit() {
    let input: Observable<string>;
    if (this.id == 'primary') {
      input = this.raningSystemService.getPrimarySystemId();
    } else {
      input = of(this.id);
    }

    input
      .pipe(
        switchMap((systemId) => this._loadRanking(systemId)),
        take(1)
      )
      .subscribe((system) => {
        let level = system.amountOfLevels ?? 0;
        const data = system.pointsWhenWinningAgainst?.map(
          (winning: number, index: number) => {
            return {
              level: level--,
              pointsToGoUp:
                level !== 0
                  ? Math.round(system.pointsToGoUp?.[index] ?? 0)
                  : null,
              pointsToGoDown:
                index === 0
                  ? null
                  : Math.round(system.pointsToGoDown?.[index - 1] ?? 0),
              pointsWhenWinningAgainst: Math.round(winning),
            } as RankingScoreTable;
          }
        );

        if (data) {
          this.dataSource.data = data;
        }
      });
  }

  _loadRanking(systemId: string) {
    {
      return this.apollo
        .query<{
          rankingSystem: Partial<RankingSystem>;
        }>({
          query: gql`
            query GetSystemForTable($id: ID!) {
              rankingSystem(id: $id) {
                id
                name
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
                pointsWhenWinningAgainst
                calculationIntervalLastUpdate
                primary
              }
            }
          `,
          variables: {
            id: systemId,
          },
        })
        .pipe(
          transferState(
            'rankingKey-' + systemId,
            this.transferState,
            this.platformId
          ),
          map((result) => {
            if (!result?.data.rankingSystem) {
              throw new Error('No player');
            }
            return new RankingSystem(result.data.rankingSystem);
          }),
          first()
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
