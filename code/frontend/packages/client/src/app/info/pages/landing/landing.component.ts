import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { ITdDataTableColumn } from '@covalent/core/data-table';
import { switchMap, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SystemService } from 'app/_shared';

@Component({
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  caps$!: Observable<any>;

  capsColumns: ITdDataTableColumn[];

  constructor(private systemService: SystemService, translateService: TranslateService) {
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
    this.caps$ = this.systemService.getPrimarySystem().pipe(
      switchMap((systems) => this.systemService.getSystemCaps(systems!.id!)),
      map((systemCaps: any) => {
        let level = 12;
        return systemCaps.pointsWhenWinningAgainst.map((winning: number, index: number) => {
          return {
            level: level--,
            pointsToGoUp: level !== 0 ? Math.round(systemCaps.pointsToGoUp[index]) : null,
            pointsToGoDown: index === 0 ? null : Math.round(systemCaps.pointsToGoDown[index - 1]),
            pointsWhenWinningAgainst: Math.round(winning),
          };
        });
      })
    );
  }
}
