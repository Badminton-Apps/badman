import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo, gql } from 'apollo-angular';
import { map, switchMap, take } from 'rxjs/operators';
import { RankingSystem, SystemService } from '../../../_shared';

@Component({
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  dataSource?: MatTableDataSource<any>;

  displayedColumns = [
    'level',
    'pointsToGoUp',
    'pointsToGoDown',
    'pointsWhenWinningAgainst',
  ];

  constructor(private systemService: SystemService, private apollo: Apollo) {}

  ngOnInit(): void {
    this.systemService
      .getPrimarySystemsWhere()
      .pipe(
        switchMap((query) => {
          const where: { [key: string]: unknown } = {};

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

          return this.apollo.query<{
            rankingSystems: Partial<RankingSystem>[];
          }>({
            query: gql`
              query GetSystems($where: JSONObject) {
                rankingSystems(where: $where) {
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
        map((x) => x.data.rankingSystems?.map((x) => new RankingSystem(x))),
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
          let level = system.amountOfLevels;
          return system.pointsWhenWinningAgainst.map(
            (winning: number, index: number) => {
              return {
                level: level--,
                pointsToGoUp:
                  level !== 0 ? Math.round(system.pointsToGoUp[index]) : null,
                pointsToGoDown:
                  index === 0
                    ? null
                    : Math.round(system.pointsToGoDown[index - 1]),
                pointsWhenWinningAgainst: Math.round(winning),
              };
            }
          );
        }),
        take(1)
      )
      .subscribe((data) => {
        this.dataSource = new MatTableDataSource(data);
      });
  }
}
