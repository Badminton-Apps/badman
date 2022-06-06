import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { RankingSystem, SystemService } from '../../../../../_shared';

@Component({
  templateUrl: './detail-ranking-system.component.html',
  styleUrls: ['./detail-ranking-system.component.scss'],
})
export class DetailRankingSystemComponent implements OnInit {
  system!: RankingSystem;
  allGenders$!: Observable<any>;
  male$!: Observable<any>;
  female$!: Observable<any>;
  final$!: Observable<any>;
  caps$!: Observable<any>;
  start$!: Observable<any>;
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
    private systemService: SystemService,
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
        return this.systemService.getSystemCaps(id);
      }),
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
      switchMap((id) => this.systemService.getSystemWithCount(id)),
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
      switchMap((id) => this.systemService.getSystemWithCount(id, 'M')),
      map((system) => this.getSeriesData(system))
    );
    this.female$ = id$.pipe(
      switchMap((id) => this.systemService.getSystemWithCount(id, 'F')),
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

  private getSeriesData(system: any) {
    console.warn('Fix me type!');
    const seriesData = {
      single: [],
      double: [],
      mix: [],
    };

    seriesData.single = system.counts.single.map((x: any) => {
      const points = x.points.map((point: any) => {
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
    seriesData.double = system.counts.double.map((x: any) => {
      const points = x.points.map((point: any) => {
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
    seriesData.mix = system.counts.mix.map((x: any) => {
      const points = x.points.map((point: any) => {
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
}
