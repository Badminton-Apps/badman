import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { ITdDataTableColumn } from '@covalent/core/data-table';
import { switchMap, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { RankingSystem, SystemService } from 'app/_shared';
import { Apollo, gql } from 'apollo-angular';

@Component({
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  caps$!: Observable<any>;

  capsColumns: ITdDataTableColumn[];

  constructor(private systemService: SystemService, private apollo: Apollo, translateService: TranslateService) {
    this.capsColumns = [
      {
        name: 'level',
        label: translateService.instant('faq.points.table.level'),
      },
      {
        name: 'pointsWhenWinningAgainst',
        label: translateService.instant('faq.points.table.points-won'),
      },
      {
        name: 'pointsToGoUp',
        label: translateService.instant('faq.points.table.points-needed-up'),
      },
      {
        name: 'pointsToGoDown',
        label: translateService.instant('faq.points.table.points-needed-down'),
      },
    ];
  }

  ngOnInit(): void {
    this.caps$ = this.systemService.getPrimarySystemsWhere().pipe(
      switchMap((query) => {
        const where = {};

        if (!query.primary) {
          where['$or'] = [
            {
              primary: true,
            },
            {
              id: query.id,
            },
          ];
        } else {
          where['primary'] = true;
        }

        return this.apollo.query<{ systems: Partial<RankingSystem>[] }>({
          query: gql`
            query GetSystems($where: SequelizeJSON) {
              systems(where: $where) {
                id
                name
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
                pointsWhenWinningAgainst
                primary
              }
            }
          `,
          variables: {
            where,
          },
        });
      }),
      map((x) => x.data.systems?.map((x) => new RankingSystem(x))),
      map((s) => {
        if (s.length > 1) {
          return s.find((x) => x.primary == false);
        } else if (s.length == 1) {
          return s[0];
        } else {
          throw 'No systems found';
        }
      }),
      map((system: any) => {
        let level = system.amountOfLevels!;
        return system.pointsWhenWinningAgainst.map((winning: number, index: number) => {
          return {
            level: level--,
            pointsToGoUp: level !== 0 ? Math.round(system.pointsToGoUp[index]) : null,
            pointsToGoDown: index === 0 ? null : Math.round(system.pointsToGoDown[index - 1]),
            pointsWhenWinningAgainst: Math.round(winning),
          };
        });
      })
    );
  }
}
