import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoadingBlockComponent } from '@badman/frontend-components';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { ApexAxisChartSeries, ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  selector: 'badman-competition-detail-avg',
  templateUrl: './detail-avg.page.html',
  styleUrls: ['./detail-avg.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NgApexchartsModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    LoadingBlockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailAvgPageComponent implements OnInit {
  eventCompetition!: EventCompetition;

  genders: ('M' | 'F')[] = ['M', 'F'];
  chartTypes: ('single' | 'double' | 'mix')[] = ['single', 'double', 'mix'];
  eventTypes: ('M' | 'F' | 'MX')[] = ['M', 'F', 'MX'];

  chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      animations: {
        speed: 500,
      },
      zoom: {
        enabled: false,
      },
    },
    grid: {
      strokeDashArray: 5,
      borderColor: 'rgba(241, 241, 241, 0.1)',
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    stroke: {
      curve: 'straight',
      width: 2,
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => value.toFixed(2),
    },
    theme: {
      mode: 'dark',
    },
    xaxis: {
      labels: {
        show: false,
      },
    },
    yaxis: [
      {
        title: {
          text: 'Average Level',
        },
        min: 1,
        max: 12,
        tickAmount: 12,
        reversed: true,
        labels: {
          formatter: (value: number) => Math.round(value).toString(),
        },
      },
      {
        opposite: true,
        labels: {
          formatter: (value: number) => Math.round(value).toString(),
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        {
          formatter: (val: number) => val.toFixed(2),
        },
        {
          formatter: (val: number) => val.toFixed(0),
        },
      ],
    },
  };

  subEvents$?: Observable<SubEventCompetition[] | undefined>;

  constructor(
    private readonly translate: TranslateService,
    private readonly breadcrumbsService: BreadcrumbService,
    private readonly route: ActivatedRoute,
    private readonly apollo: Apollo,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.data,
      this.translate.get(['all.competition.title', 'all.competition.avg-level']),
    ]).subscribe(([data, translations]) => {
      this.eventCompetition = data['eventCompetition'];
      this.breadcrumbsService.set('@eventCompetition', this.eventCompetition.name || '');
      this.breadcrumbsService.set('competition', translations['all.competition.title']);
      this.breadcrumbsService.set(
        'competition/:id/avg-level',
        translations['all.competition.avg-level'],
      );
    });

    this.subEvents$ = this._getAvgLevel();
  }

  chartXAxis(subEvents: SubEventCompetition[], eventType: 'M' | 'F' | 'MX') {
    return {
      categories: subEvents.filter((s) => s.eventType == eventType).map((s) => s.name),
    } as ApexOptions['xaxis'];
  }

  chartSeries(
    subEvents: SubEventCompetition[],
    gender: 'M' | 'F',
    chartType: 'single' | 'double' | 'mix',
    eventType: 'M' | 'F' | 'MX',
  ) {
    const filteredSubEvents = subEvents.filter((s) => s.eventType == eventType);

    if (filteredSubEvents.length == 0) return;

    const genderData = filteredSubEvents
      .map((subEvent) => {
        const genderData = subEvent.averageLevel?.find((a) => a.gender == gender);
        return {
          avgerage: genderData?.[chartType] as number,
          count: genderData?.[`${chartType}Count`] as number,
        };
      })
      ?.filter((s) => s.avgerage != null && s.count != null);

    if (genderData.length == 0) return;

    return [
      {
        name: 'Average',
        data: genderData?.map((s) => s.avgerage),
      },
      {
        name: 'Players',
        data: genderData?.map((s) => s.count),
        show: false,
      },
    ] as ApexAxisChartSeries;
  }

  chartTitle(
    gender: 'M' | 'F',
    chartType: 'single' | 'double' | 'mix',
    eventType: 'M' | 'F' | 'MX',
  ) {
    return {
      text: `Reeks: ${eventType}, Geslacht: ${gender}, Dicipline: ${chartType}`,
      align: 'center',
      margin: 5,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
      },
    } as ApexOptions['title'];
  }

  downloadData(subEvents: SubEventCompetition[]) {
    const csv = this.convertToCSV(subEvents);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private convertToCSV(data: SubEventCompetition[]): string {
    const headers = [
      'name',
      'gender',
      'single',
      'singleCount',
      'double',
      'doubleCount',
      'mix',
      'mixCount',
    ];
    // const rows = data.map((row) => [row.name, row.data.join(';')]);
    const rows = data
      .map((row) => {
        const data = row.averageLevel?.map((a) => {
          return [a.gender, a.single, a.singleCount, a.double, a.doubleCount, a.mix, a.mixCount];
        });

        return data?.map((r) => [`${row.name} - ${row.eventType}`, r.join(',')]);
      })
      .flat();

    const csvArray = [headers, ...rows];
    return csvArray.map((row) => row?.join(',')).join('\n');
  }

  private _getAvgLevel() {
    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: gql`
          query GetAvgLevel($id: ID!) {
            eventCompetition(id: $id) {
              id
              subEventCompetitions {
                id
                name
                eventType
                averageLevel {
                  gender
                  single
                  singleCount
                  double
                  doubleCount
                  mix
                  mixCount
                }
              }
            }
          }
        `,
        variables: {
          id: this.eventCompetition.id,
        },
      })
      .pipe(
        take(1),
        map((result) => {
          return result.data.eventCompetition.subEventCompetitions?.map(
            (s) => new SubEventCompetition(s),
          );
        }),
      );
  }
}
