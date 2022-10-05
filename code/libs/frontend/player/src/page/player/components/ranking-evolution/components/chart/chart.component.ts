import { Component, Input, OnInit } from '@angular/core';
import moment from 'moment';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'badman-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
})
export class ChartComponent implements OnInit {
  options!: EChartsOption;

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
  maxLevels?: number;

  @Input()
  probablyInacurate: moment.Moment = moment('2018-07-31T22:00:00.000Z');

  firstDay!: Date;
  lastDay!: Date;

  seriesData: {
    name: { top: string; bottom: string };
    value: [Date, number];
  }[] = [];
  seriesDataInacc: {
    name: { top: string; bottom: string };
    value: [Date, number];
  }[] = [];

  ngOnInit(): void {
    // Get the years for start / end to space them in year basis
    if (this.rankingPlaces && this.rankingPlaces.length > 0) {
      const lastDay = moment(
        this.rankingPlaces.reduce((prev, current) =>
          prev.rankingDate > current.rankingDate ? prev : current
        ).rankingDate
      )
        .startOf('year')
        .add(1, 'year');
      const firstDay = moment(
        this.rankingPlaces.reduce((prev, current) =>
          prev.rankingDate < current.rankingDate ? prev : current
        ).rankingDate
      ).startOf('year');
      this.firstDay = firstDay.toDate();
      this.lastDay = lastDay.toDate();
    }

    this.createSeries();

    this.options = {
      autoResize: true,
      title: {
        text: this.title,
      },
      grid: {
        left: 25,
        top: 30,
        right: 0,
        bottom: 25,
      },
      tooltip: {
        formatter: (params: any) => {
          return ` 
          <div fxLayout="row" fxFlexAlign="start center">
            <span class="mat-caption pad-left-sm">
              ${params?.data?.name?.top} <br />
              ${params?.data?.name?.bottom}
            </span>
          </div>`;
        },
      },
      xAxis: {
        type: 'time',
        min: this.firstDay,
        max: this.lastDay,
      },
      yAxis: {
        type: 'value',
        max: 0,
        min: this.maxLevels,
        inverse: true,
        interval: 2,
      },
      series: [
        {
          type: 'line',
          name: 'acc',
          data: this.seriesData as any,
          color: '#F2724B',
        },
        {
          type: 'line',
          name: 'inacc',
          color: '#F2724B',
          data: this.seriesDataInacc as any,
        },
      ],
      animationEasing: 'elasticOut',
    };
  }

  createSeries() {
    this.rankingPlaces
      .filter((places) => places.updatePossible)
      .forEach((x) => {
        const rankingDate = moment(x.rankingDate);

        const topText = `Level ${x.level} on ${rankingDate.format('DD-MM-Y')}`;
        let bottomText = ``;
        if (x.points) {
          bottomText += `${x.points} upgrade`;
        }
        if (x.points && x.pointsDowngrade) {
          bottomText += `, `;
        } else {
          bottomText += ` points`;
        }
        if (x.pointsDowngrade) {
          bottomText += `${x.pointsDowngrade} downgrade points`;
        }

        if (rankingDate.isBefore(this.probablyInacurate)) {
          this.seriesDataInacc.push({
            name: {
              top: topText,
              bottom: bottomText,
            },
            value: [rankingDate.toDate(), x.level],
          });
        } else {
          this.seriesData.push({
            name: {
              top: topText,
              bottom: bottomText,
            },
            value: [rankingDate.toDate(), x.level],
          });
        }
      });

    // adding the last value from series data to inacc to complete the line
    // the last value because that's how the sorting was configured
    this.seriesDataInacc.unshift(this.seriesData[this.seriesData.length - 1]);
  }
}
