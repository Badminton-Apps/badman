import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RankingSystem } from '@badman/frontend-models';
import { SystemCounts } from '@badman/frontend-ranking';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { SerieData } from './interfaces';

@Component({
  templateUrl: './detail-ranking-system.component.html',
  styleUrls: ['./detail-ranking-system.component.scss'],
})
export class DetailRankingSystemComponent implements OnInit {
  system!: RankingSystem;
  allGenders$!: Observable<SerieData>;
  male$!: Observable<SerieData>;
  female$!: Observable<SerieData>;
  final$!: Observable<
    { name: string; values: { name: number; value: number }[] }[]
  >;
  start$!: Observable<
    { name: string; values: { name: number; value: number }[] }[]
  >;
  caps$!: Observable<
    {
      level: number;
      pointsToGoUp: number | null;
      pointsToGoDown: number | null;
      pointsWhenWinningAgainst: number;
    }[]
  >;

  levels!: number[];

  // capsColumns: ITdDataTableColumn[] = [
  //   { name: 'level', label: 'Level' },
  //   { name: 'pointsWhenWinningAgainst', label: 'Points won Against' },
  //   { name: 'pointsToGoUp', label: 'Points needed to go up' },
  //   { name: 'pointsToGoDown', label: 'Points needed to go down' },
  // ];

  config = {
    title: {
      text: 'Overview players',
    },
    tooltip: {
      show: true,
    },
    legend: {
      right: 10,
      data: ['S M', 'D M', 'MX M', 'S F', 'D F', 'MX F'],
    },
  };

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      shareReplay(1),
      map((id) => {
        if (!id) {
          throw new Error('No id');
        }
        return id;
      })
    );

    this.caps$ = id$.pipe(
      switchMap((id) => {
        return this.apollo.query<{ system: Partial<RankingSystem> }>({
          query: gql`
            query GetSystemQuery($id: ID!) {
              system(id: $id) {
                id
                name
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
                pointsWhenWinningAgainst
              }
            }
          `,
          variables: {
            id,
          },
        });
      }),
      map((x) => new RankingSystem(x.data.system)),
      map((system) => {
        if (
          !system ||
          !system.pointsWhenWinningAgainst ||
          !system.pointsToGoUp ||
          !system.pointsToGoDown ||
          !system.amountOfLevels
        ) {
          throw new Error('No system');
        }

        let level = system.amountOfLevels;
        return system.pointsWhenWinningAgainst.map((winning, index) => {
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
          };
        });
      })
    );

    this.allGenders$ = id$.pipe(
      switchMap((id) => this.getSystemWithCount(id)),
      tap(
        (system) =>
          (this.levels = Array(system.amountOfLevels)
            .fill(null)
            .map((x, i) => i + 1))
      ),
      tap((system) => (this.system = system)),
      map((system) => this.getSeriesData(system))
    );
    this.male$ = id$.pipe(
      switchMap((id) => this.getSystemWithCount(id, 'M')),
      map((system) => this.getSeriesData(system))
    );
    this.female$ = id$.pipe(
      switchMap((id) => this.getSystemWithCount(id, 'F')),
      map((system) => this.getSeriesData(system))
    );

    this.final$ = combineLatest([this.male$, this.female$]).pipe(
      map(([male, female]) => {
        return [
          {
            name: 'S M',
            values: male.single[male.single.length - 1].points,
          },
          {
            name: 'D M',
            values: male.double[male.double.length - 1].points,
          },
          {
            name: 'MX M',
            values: male.mix[male.mix.length - 1].points,
          },
          {
            name: 'S F',
            values: female.single[female.single.length - 1].points,
          },
          {
            name: 'D F',
            values: female.double[female.double.length - 1].points,
          },
          {
            name: 'MX F',
            values: female.mix[female.mix.length - 1].points,
          },
        ];
      })
    );
    this.start$ = combineLatest([this.male$, this.female$]).pipe(
      map(([male, female]) => {
        return [
          {
            name: 'S M',
            values: male.single[0].points,
          },
          {
            name: 'D M',
            values: male.double[0].points,
          },
          {
            name: 'MX M',
            values: male.mix[0].points,
          },
          {
            name: 'S F',
            values: female.single[0].points,
          },
          {
            name: 'D F',
            values: female.double[0].points,
          },
          {
            name: 'MX F',
            values: female.mix[0].points,
          },
        ];
      })
    );
  }

  private getSeriesData(
    system: RankingSystem & {
      counts: {
        single: SystemCounts[];
        double: SystemCounts[];
        mix: SystemCounts[];
      };
    }
  ) {
    const seriesData = {
      single: [],
      double: [],
      mix: [],
    } as SerieData;

    seriesData.single = system.counts.single.map((x) => {
      const points = x.points.map((point) => {
        return {
          name: point.level,
          value: point.amount,
        };
      });

      return {
        date: moment(parseInt(x.date, 10)),
        points,
      };
    });
    seriesData.double = system.counts.double.map((x) => {
      const points = x.points.map((point) => {
        return {
          name: point.level,
          value: point.amount,
        };
      });

      return {
        date: moment(parseInt(x.date, 10)),
        points,
      };
    });
    seriesData.mix = system.counts.mix.map((x) => {
      const points = x.points.map((point) => {
        return {
          name: point.level,
          value: point.amount,
        };
      });

      return {
        date: moment(parseInt(x.date, 10)),
        points,
      };
    });
    return seriesData;
  }

  private getSystemWithCount(systemId: string, gender?: string) {
    return this.apollo
      .query<{ system: Partial<RankingSystem> }>({
        query: gql`
          query GetSystemsQuery($id: ID!, $gender: String) {
            rankingSystems(id: $id) {
              id
              name
              primary
              runCurrently
              amountOfLevels
              counts(gender: $gender) {
                single {
                  date
                  points {
                    level
                    amount
                  }
                }
                double {
                  date
                  points {
                    level
                    amount
                  }
                }
                mix {
                  date
                  points {
                    level
                    amount
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: systemId,
          gender,
        },
      })
      .pipe(
        map(
          (x) =>
            x.data?.system as RankingSystem & {
              counts: {
                single: SystemCounts[];
                double: SystemCounts[];
                mix: SystemCounts[];
              };
            }
        )
      );
  }
}
