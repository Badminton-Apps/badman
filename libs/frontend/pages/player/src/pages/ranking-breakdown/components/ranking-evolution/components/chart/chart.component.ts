import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ThemeSwitcherService } from '@badman/frontend-components';
import { RankingSystem } from '@badman/frontend-models';
import moment from 'moment';
// import { EChartsOption } from 'echarts';
import {
  ApexAnnotations,
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent as ApexChartComponent,
  ApexDataLabels,
  ApexFill,
  ApexForecastDataPoints,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTheme,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
  YAxisAnnotations,
} from 'ng-apexcharts';

export type ChartOptions = {
  series?: ApexAxisChartSeries;
  annotations?: ApexAnnotations;
  chart?: ApexChart;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis[];
  title?: ApexTitleSubtitle;
  markers?: ApexMarkers;
  colors?: string[];
  fill?: ApexFill;
  forecastDataPoints?: ApexForecastDataPoints;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  theme?: ApexTheme;
};

@Component({
  selector: 'badman-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  standalone: true,
  imports: [
    CommonModule,

    // Material

    // Other
    NgApexchartsModule,
  ],
})
export class ChartComponent implements OnInit {
  // options!: EChartsOption;
  @ViewChild('chart') chart?: ApexChartComponent;
  public chartOptions?: Partial<ChartOptions>;

  constructor(private themeSwitcher: ThemeSwitcherService) {}

  @Input()
  rankingPlaces!: {
    level: number;
    rankingDate: Date;
    points: number;
    pointsDowngrade: number;
    updatePossible: boolean;
  }[];

  @Input()
  title!: string;

  @Input()
  system!: RankingSystem;

  @Input()
  probablyInacurate: moment.Moment = moment('2018-07-31T22:00:00.000Z');

  maxPoints = 0;

  levelSeries: { x: number; y: number }[] = [];
  pointsSeries: { x: number; y: number | [number, number] }[] = [];

  nextLevel?: number;
  prevLevel?: number;

  ngOnInit(): void {
    this.createSeries();

    const upMax = this.maxPoints * 1.5;
    const annotations: YAxisAnnotations[] = [];

    if ((this.nextLevel ?? 0) < upMax) {
      annotations.push({
        y: this.nextLevel,
        yAxisIndex: 1,
        borderColor: '#696',
        label: {
          borderColor: '#696',
          style: {
            color: '#fff',
            background: '#696',
          },
          position: 'center',
          text: 'Points needed',
        },
      });
    }

    const isDark = this.themeSwitcher.currentActive == 'dark';

    // if ((this.prevLevel ?? 0) < upMax) {
    //   annotations.push({
    //     y: this.prevLevel,
    //     yAxisIndex: 1,
    //     borderColor: '#999',
    //     label: {
    //       borderColor: '#999',
    //       style: {
    //         color: '#fff',
    //         background: '#999',
    //       },
    //       text: 'prev level',
    //     },
    //   });
    // }

    this.chartOptions = {
      series: [
        {
          type: 'line',
          name: 'ranking',
          data: this.levelSeries,
        },
        {
          type: 'area',
          name: 'points',
          data: this.pointsSeries,
        },
      ],
      chart: {
        type: 'rangeArea',
        animations: {
          speed: 500,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#d4526e', '#d4526e'],
      dataLabels: {
        enabled: false,
      },
      fill: {
        opacity: [1, 0.15],
      },
      stroke: {
        curve: ['straight', 'smooth'],
        width: [2, 0.2],
      },
      legend: {
        show: false,
        inverseOrder: true,
      },
      markers: {
        hover: {
          sizeOffset: 5,
        },
      },
      title: {
        text: this.title,
      },

      xaxis: {
        type: 'datetime',
      },
      yaxis: [
        {
          min: 0,
          max: this.system.amountOfLevels,
          reversed: true,
        },
        {
          min: 0,
          max: upMax,
          opposite: true,
        },
      ],
      theme: {
        mode: isDark ? 'dark' : 'light',
      },
      tooltip: {
        enabled: false,
        enabledOnSeries: [0, 2],
      },
      annotations: {
        yaxis: annotations,
      },
    };
  }

  createSeries() {
    // sort places
    this.rankingPlaces
      .sort((a, b) => a.rankingDate.getTime() - b.rankingDate.getTime())
      .forEach((x) => {
        const rankingDate = moment(x.rankingDate);

        if (x.updatePossible) {
          this.levelSeries.push({
            x: rankingDate.valueOf(),
            y: x.level,
          });
        }

        if (x.points) {
          if (x.points > this.maxPoints || x.pointsDowngrade > this.maxPoints) {
            this.maxPoints = x.points;
          }

          this.pointsSeries.push({
            x: rankingDate.valueOf(),
            // y: x.points,
            y: [x.pointsDowngrade, x.points],
          });
        }
      });

    // get last level of the series
    const lastLevel = this.levelSeries[this.levelSeries.length - 1].y ?? 12;

    if (lastLevel === 1) {
      return;
    }

    this.nextLevel =
      this.system.pointsToGoUp?.[
        (this.system.amountOfLevels ?? 12) - lastLevel
      ];

    if (lastLevel === 12) {
      return;
    }
    this.prevLevel =
      this.system.pointsToGoUp?.[
        (this.system.amountOfLevels ?? 12) - lastLevel + 1
      ];
  }
}
